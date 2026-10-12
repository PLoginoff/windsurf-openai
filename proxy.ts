/**
 * OpenAI-compatible HTTP proxy → Cognition Connect-RPC.
 *
 * Binds at 127.0.0.1:42100 (or fallback port). Accepts standard
 * /v1/chat/completions and /v1/models requests, translates to
 * WindSurf's cloud-direct GetChatMessage wire format.
 */
import * as crypto from "crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { streamChatEvents, CloudChatError, type ChatHistoryItem, type ToolDef } from "./chat";
import { loadCredentials } from "./oauth";
import { getCachedCatalog } from "./catalog";
import { getUserStatus, getCachedUserStatus, isPromoActive, type UserStatusModel } from "./status";
import { stripCostAnnotation, tierAnnotation, tierFromCredits, userTierOverride, titleizeModelId, type PriceTier, type UsageSummary } from "./costs";
import { FEATURED_UIDS } from "./featured";

const WINDSURF_PROXY_HOST = "127.0.0.1";
const WINDSURF_PROXY_PORT = 42100;

// ----------------------------------------------------------------------------
// Proxy handler (Node http server)
// ----------------------------------------------------------------------------

interface ChatCompletionRequest {
  model?: string;
  messages: Array<{
    role: string;
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    tool_call_id?: string;
    tool_calls?: Array<{ id?: string; type?: string; function?: { name?: string; arguments?: string } }>;
  }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  tools?: Array<{ type?: string; function?: { name?: string; description?: string; parameters?: Record<string, unknown> } }>;
}

function mapMessageToHistoryItem(m: ChatCompletionRequest["messages"][number]): ChatHistoryItem {
  const item: ChatHistoryItem = { role: m.role as ChatHistoryItem["role"], content: m.content as ChatHistoryItem["content"] };
  if (m.role === "tool" && typeof m.tool_call_id === "string" && m.tool_call_id.length > 0) {
    item.tool_call_id = m.tool_call_id;
  }
  if (m.role === "assistant" && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
    item.tool_calls = m.tool_calls
      .map(tc => ({ id: typeof tc.id === "string" ? tc.id : "", name: typeof tc.function?.name === "string" ? tc.function.name : "", arguments: typeof tc.function?.arguments === "string" ? tc.function.arguments : "" }))
      .filter(tc => tc.id !== "" && tc.name !== "");
  }
  return item;
}

// ----------------------------------------------------------------------------
// Model list — live per-account data from GetUserStatus, catalog fallback
// ----------------------------------------------------------------------------

export interface ModelListItem {
  id: string; // client-facing id: pretty display name with tier annotation.
  // Zed's llama.cpp provider derives what it shows AND what it sends back from
  // `id`, so the tier must live there. Resolution maps it back to `canonical`.
  name: string;
  canonical: string; // canonical id / model_uid used to route chat requests
  tier: PriceTier;
  contextWindow?: number;
}

// Sort order: featured first (in list order), then promo/free, cheap → expensive, unknown last.
const TIER_ORDER: Record<PriceTier, number> = { free: 0, "$": 1, "$$": 2, "$$$": 3, unknown: 4 };

function featuredRank(uid: string): number {
  const idx = FEATURED_UIDS.indexOf(uid);
  return idx === -1 ? FEATURED_UIDS.length : idx;
}

// Zed re-sorts the model list alphabetically by name (llama_cpp.rs:
// `models.sort_by_key(|model| model.name())`), ignoring our /v1/models order.
// To pin featured models on top anyway, their ids get three leading spaces:
// space sorts before any letter, so all featured land above the rest
// (their internal order is alphabetical — fine). Small indent in Zed's picker.
function featuredIndent(uid: string): string {
  return FEATURED_UIDS.includes(uid) ? "   " : "";
}

// Tier for a live model: tiers.json override wins, then promo → free,
// then Windsurf's credits-per-prompt, then "unknown".
function tierForLiveModel(m: UserStatusModel): PriceTier {
  const override = userTierOverride(m.uid);
  if (override) return override;
  if (isPromoActive(m)) return "free";
  if (m.creditsPerPrompt !== undefined) return tierFromCredits(m.creditsPerPrompt);
  return "unknown";
}

export async function buildModelList(): Promise<ModelListItem[]> {
  const out: ModelListItem[] = [];
  const seen = new Set<string>();
  const push = (uid: string, label: string, tier: PriceTier, contextWindow?: number): void => {
    if (seen.has(uid)) return;
    seen.add(uid);
    out.push({ id: label, name: label, canonical: uid, tier, ...(contextWindow ? { contextWindow } : {}) });
  };

  // Live account data — GetUserStatus (the endpoint the Windsurf plugin uses):
  // the full per-account model list with labels, context windows, credits, promos.
  let creds: { apiKey: string; apiServerUrl: string } | null = null;
  try { creds = loadCredentials(); } catch {}
  if (creds) {
    let liveOk = false;
    try {
      const status = await getUserStatus(creds.apiKey, creds.apiServerUrl);
      if (status.models.size > 0) {
        liveOk = true;
        for (const m of status.models.values()) {
          if (m.disabled) continue;
          const tier = tierForLiveModel(m);
          const label = `${featuredIndent(m.uid)}${m.label}${tierAnnotation(tier)}`;
          push(m.uid, label, tier, m.contextWindow);
        }
      }
    } catch {}

    // Fallback: GetCascadeModelConfigs (404s on self-serve hosts). No credits
    // data here — tiers come from tiers.json overrides or "unknown".
    if (!liveOk) {
      try {
        const catalog = await getCachedCatalog(creds.apiKey, creds.apiServerUrl);
        if (catalog) {
          for (const [uid, entry] of catalog.byUid) {
            if (entry.disabled) continue;
            const tier = userTierOverride(uid) ?? "unknown";
            const base = entry.label && entry.label !== uid ? entry.label : titleizeModelId(uid);
            push(uid, `${featuredIndent(uid)}${base}${tierAnnotation(tier)}`, tier);
          }
        }
      } catch {}
    }
  }

  // featured first (in FEATURED_UIDS order), then free/promo → $ → $$ → $$$,
  // unknown last; alphabetical within each group
  out.sort((a, b) =>
    (featuredRank(a.canonical) - featuredRank(b.canonical)) ||
    (TIER_ORDER[a.tier] - TIER_ORDER[b.tier]) ||
    a.id.localeCompare(b.id),
  );
  return out;
}

// Resolve what a client sends as `model` back to a model_uid:
//  1. pretty label from our own list (incl. leading featured-indent spaces)
//  2. live catalog label
//  3. raw model_uid passthrough
async function resolveRequestedModel(raw: string | undefined): Promise<string> {
  const stripped = raw ? stripCostAnnotation(raw) : "";
  if (!stripped) return "";
  const trimmed = stripped.trim();
  const items = await buildModelList();
  // Pretty id / name from /v1/models — exact match first, then trimmed
  // (in case a client strips the featured indent spaces)
  const byId = items.find(m => m.id === raw || m.id === stripped || m.name === stripped)
    ?? items.find(m => m.id.trim() === trimmed || m.name.trim() === trimmed);
  if (byId) return byId.canonical;
  // Live catalog label without annotation ("Claude Opus 5.5 Medium")
  const status = getCachedUserStatus();
  if (status) {
    const lower = trimmed.toLowerCase();
    for (const m of status.models.values()) {
      if (m.label.toLowerCase() === lower) return m.uid;
    }
  }
  // Raw model_uid passthrough (the client knows a uid we didn't list)
  return trimmed;
}

// Best-available tier for a model_uid: live promo/credits + tiers.json override.
function tierForModel(uid: string): PriceTier {
  const status = getCachedUserStatus();
  const m = status?.models.get(uid);
  if (m) return tierForLiveModel(m);
  return userTierOverride(uid) ?? "unknown";
}

function logCost(modelId: string, usage: UsageSummary | null): void {
  if (!usage) return;
  const fmt = (n?: number) => (n ?? 0).toLocaleString("en-US");
  console.error(`[windsurf] ${modelId}  in=${fmt(usage.promptTokens)} out=${fmt(usage.completionTokens)}  (${tierForModel(modelId)})`);
}

function openAIError(status: number, message: string, details?: string): object {
  return { status, body: JSON.stringify({ error: { message: details ? `${message}\n${details}` : message, type: "windsurf_error", param: null, code: null } }), contentType: "application/json" };
}

function isLoopbackAddress(addr: string | undefined): boolean {
  return addr === "127.0.0.1" || addr === "::1" || addr === "::ffff:127.0.0.1";
}

async function authorizeRequest(req: IncomingMessage): Promise<{ status: number; body: string; contentType: string } | null> {
  // Local clients (Zed, curl on this machine) are trusted without a Bearer key —
  // the proxy is localhost-oriented and the key only guards remote access when
  // bound to a non-loopback host (--host 0.0.0.0).
  if (isLoopbackAddress(req.socket.remoteAddress)) return null;

  const authHeader = (req.headers.authorization ?? "") as string;
  if (!authHeader.startsWith("Bearer ")) {
    return { status: 401, body: JSON.stringify({ error: { message: "Unauthorized: missing or malformed Authorization header.", type: "windsurf_error" } }), contentType: "application/json" };
  }
  const presented = authHeader.slice("Bearer ".length);
  const presentedBuf = Buffer.from(presented, "utf8");

  // Accept the persisted apiKey from disk (from `cli.ts login`)
  try {
    const creds = loadCredentials();
    if (creds?.apiKey) {
      const credBuf = Buffer.from(creds.apiKey, "utf8");
      if (presentedBuf.length === credBuf.length && crypto.timingSafeEqual(presentedBuf, credBuf)) return null;
    }
  } catch {}

  return { status: 401, body: JSON.stringify({ error: { message: "Unauthorized: Invalid Bearer token.", type: "windsurf_error" } }), contentType: "application/json" };
}

function getBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", c => chunks.push(Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const url = new URL(req.url ?? "/", `http://${WINDSURF_PROXY_HOST}`);

    // /health — unauthenticated
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // GET /v1/models and /props — unauthenticated, so Zed's dynamic providers
    // (llama.cpp / LM Studio) can list models before an API key is configured.
    // These leak nothing (model names/tiers only, localhost-bound); chat still
    // requires the Bearer key.
    if (req.method === "GET" && (url.pathname === "/v1/models" || url.pathname === "/models")) {
      const items = await buildModelList();
      const created = Math.floor(Date.now() / 1000);
      const data = items.map(m => ({
        id: m.id,
        object: "model",
        created,
        owned_by: "windsurf",
        name: m.name,
        ...(m.contextWindow ? { meta: { n_ctx_train: m.contextWindow } } : {}),
        architecture: { input_modalities: ["text", "image"] },
        // Router mode: Zed probes /props?model=<id> per model for capabilities
        // and context, instead of one blanket /props for the whole list.
        status: { value: "loaded" },
        type: "llm",
        publisher: "windsurf",
        compatibility_type: "gguf",
        state: "loaded",
        capabilities: ["tool_use", "vision"],
        ...(m.contextWindow ? { max_context_length: m.contextWindow } : {}),
      }));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ object: "list", data }));
      return;
    }
    // /props — llama.cpp capability probe. Router mode passes ?model=<id>;
    // answer with that model's real context window.
    if (req.method === "GET" && url.pathname === "/props") {
      const model = url.searchParams.get("model");
      let nCtx = 128000;
      if (model) {
        const items = await buildModelList();
        const trimmed = model.trim();
        const hit = items.find(m => m.id === model || m.canonical === model)
          ?? items.find(m => m.id.trim() === trimmed || m.canonical === trimmed);
        if (hit?.contextWindow) nCtx = hit.contextWindow;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        default_generation_settings: { n_ctx: nCtx },
        modalities: { vision: true },
        chat_template_caps: {
          supports_tool_calls: true,
          supports_tools: true,
          supports_preserve_reasoning: true,
        },
      }));
      return;
    }

    // Auth gate for everything else
    const authErr = await authorizeRequest(req);
    if (authErr) {
      res.writeHead(authErr.status, { "Content-Type": authErr.contentType });
      res.end(authErr.body);
      return;
    }

    // /v1/chat/completions
    if (url.pathname === "/v1/chat/completions" || url.pathname === "/chat/completions") {
      if (req.method !== "POST") {
        res.writeHead(405, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "Method not allowed; use POST.", type: "windsurf_error" } }));
        return;
      }

      const rawBody = await getBody(req);
      let requestBody: ChatCompletionRequest;
      try { requestBody = JSON.parse(rawBody); }
      catch { res.writeHead(400, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: { message: "Malformed JSON." } })); return; }

      if (!requestBody.messages || !Array.isArray(requestBody.messages)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "messages must be an array." } }));
        return;
      }

      const creds = loadCredentials();
      if (!creds) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "Not authenticated. Run `windsurf-openai login` first." } }));
        return;
      }

      // Resolve what the client sends (pretty name, label, or raw uid) → model_uid.
      const modelUid = await resolveRequestedModel(requestBody.model);
      if (!modelUid) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "Missing 'model' in request body." } }));
        return;
      }

      const tools: ToolDef[] = (requestBody.tools ?? []).map(t => ({
        name: t.function?.name ?? "unknown",
        description: t.function?.description ?? "",
        parameters: t.function?.parameters ?? {},
      }));

      const multimodalMessages: ChatHistoryItem[] = requestBody.messages.map(m => mapMessageToHistoryItem(m));
      const requestedMaxTokens = typeof requestBody.max_tokens === "number" && requestBody.max_tokens > 0 ? requestBody.max_tokens : 128_000;
      const isStreaming = requestBody.stream !== false;

      if (isStreaming) {
        // SSE streaming response
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        });

        const responseId = `chatcmpl-${crypto.randomUUID()}`;
        const abort = new AbortController();
        req.on("close", () => { if (!res.writableEnded) abort.abort(); });

        try {
          let firstChunkSent = false;
          let toolCallIndex = -1;
          const toolIdToIndex = new Map<string, number>();
          let lastToolCallId: string | undefined;
          let finishReason: "stop" | "tool_calls" | "length" | "content_filter" | null = null;
          let usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | null = null;

          for await (const ev of streamChatEvents({
            apiKey: creds.apiKey,
            apiServerUrl: creds.apiServerUrl,
            modelUid,
            messages: multimodalMessages,
            tools: tools.length > 0 ? tools : undefined,
            signal: abort.signal,
            completionOpts: { maxOutputTokens: requestedMaxTokens },
          })) {
            const role = firstChunkSent ? undefined : "assistant";

            if (ev.kind === "text") {
              const chunk = { id: responseId, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: requestBody.model ?? modelUid, choices: [{ index: 0, delta: role ? { role, content: ev.text } : { content: ev.text }, finish_reason: null }] };
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
              firstChunkSent = true;
            } else if (ev.kind === "reasoning") {
              const chunk = { id: responseId, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: requestBody.model ?? modelUid, choices: [{ index: 0, delta: role ? { role, reasoning: ev.text } : { reasoning: ev.text }, finish_reason: null }] };
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
              firstChunkSent = true;
            } else if (ev.kind === "tool_call_start") {
              toolCallIndex += 1;
              toolIdToIndex.set(ev.id, toolCallIndex);
              lastToolCallId = ev.id;
              const baseDelta = { tool_calls: [{ index: toolCallIndex, id: ev.id, type: "function", function: { name: ev.name, arguments: "" } }] };
              const delta = firstChunkSent ? baseDelta : { role: "assistant", ...baseDelta };
              const chunk = { id: responseId, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: requestBody.model ?? modelUid, choices: [{ index: 0, delta, finish_reason: null }] };
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
              firstChunkSent = true;
            } else if (ev.kind === "tool_call_args") {
              if (lastToolCallId === undefined || toolCallIndex < 0) continue;
              const routeKey = ev.id ?? lastToolCallId;
              const idx = toolIdToIndex.get(routeKey) ?? toolCallIndex;
              const chunk = { id: responseId, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: requestBody.model ?? modelUid, choices: [{ index: 0, delta: { tool_calls: [{ index: idx, function: { arguments: ev.argsDelta } }] }, finish_reason: null }] };
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            } else if (ev.kind === "finish") {
              finishReason = ev.reason;
            } else if (ev.kind === "usage") {
              usage = { promptTokens: ev.promptTokens, completionTokens: ev.completionTokens, totalTokens: ev.totalTokens };
            }
          }

          const finalReason = finishReason ?? (toolCallIndex >= 0 ? "tool_calls" : "stop");
          const finishChunk = { id: responseId, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: requestBody.model ?? modelUid, choices: [{ index: 0, delta: {}, finish_reason: finalReason }] };
          res.write(`data: ${JSON.stringify(finishChunk)}\n\n`);

          if (usage) {
            const usageChunk = { id: responseId, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: requestBody.model ?? modelUid, choices: [], usage: { prompt_tokens: usage.promptTokens ?? 0, completion_tokens: usage.completionTokens ?? 0, total_tokens: usage.totalTokens ?? 0 } };
            res.write(`data: ${JSON.stringify(usageChunk)}\n\n`);
          }
          res.write("data: [DONE]\n\n");
          res.end();
          logCost(modelUid, usage);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          try {
            res.write(`data: ${JSON.stringify({ error: { message: errorMessage } })}\n\n`);
            const fChunk = { id: responseId, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: requestBody.model ?? modelUid, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] };
            res.write(`data: ${JSON.stringify(fChunk)}\n\n`);
            res.write("data: [DONE]\n\n");
            res.end();
          } catch { /* socket dead */ }
        }
      } else {
        // Non-streaming response
        let collected = "";
        let finishReason: "stop" | "tool_calls" | "length" | "content_filter" = "stop";
        let usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | null = null;
        type CollectedToolCall = { id: string; name: string; args: string };
        const collectedToolCalls: CollectedToolCall[] = [];
        let currentToolCall: CollectedToolCall | null = null;

        const abort = new AbortController();
        req.on("close", () => { if (!res.writableEnded) abort.abort(); });
        for await (const ev of streamChatEvents({
          apiKey: creds.apiKey,
          apiServerUrl: creds.apiServerUrl,
          modelUid,
          messages: multimodalMessages,
          tools: tools.length > 0 ? tools : undefined,
          completionOpts: { maxOutputTokens: requestedMaxTokens },
          signal: abort.signal,
        })) {
          if (ev.kind === "text") collected += ev.text;
          else if (ev.kind === "tool_call_start") { currentToolCall = { id: ev.id, name: ev.name, args: "" }; collectedToolCalls.push(currentToolCall); }
          else if (ev.kind === "tool_call_args") { if (currentToolCall) currentToolCall.args += ev.argsDelta; }
          else if (ev.kind === "finish") finishReason = ev.reason;
          else if (ev.kind === "usage") usage = { promptTokens: ev.promptTokens, completionTokens: ev.completionTokens, totalTokens: ev.totalTokens };
        }
        if (collectedToolCalls.length > 0 && finishReason === "stop") finishReason = "tool_calls";

        const assistantMessage = collectedToolCalls.length > 0
          ? { role: "assistant" as const, content: collected, tool_calls: collectedToolCalls.map(tc => ({ id: tc.id, type: "function" as const, function: { name: tc.name, arguments: tc.args } })) }
          : { role: "assistant" as const, content: collected };

        const resp = {
          id: `chatcmpl-${crypto.randomUUID()}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: requestBody.model ?? modelUid,
          choices: [{ index: 0, message: assistantMessage, finish_reason: finishReason }],
          ...(usage ? { usage: { prompt_tokens: usage.promptTokens ?? 0, completion_tokens: usage.completionTokens ?? 0, total_tokens: usage.totalTokens ?? 0 } } : {}),
        };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(resp));
        logCost(modelUid, usage);
      }
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: `Unsupported path: ${url.pathname}` } }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message } }));
    } catch {}
  }
}

// ----------------------------------------------------------------------------
// Server startup
// ----------------------------------------------------------------------------

let serverInstance: ReturnType<typeof createServer> | null = null;

export function startProxy(port: number = WINDSURF_PROXY_PORT, host: string = WINDSURF_PROXY_HOST): Promise<number> {
  if (serverInstance) return Promise.resolve((serverInstance.address() as { port: number }).port);

  return new Promise((resolve, reject) => {
    const srv = createServer(handleRequest);
    srv.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`[windsurf] port ${port} is busy — picking a random free port instead. Use --port to pin one.`);
        // Try fallback port
        srv.listen(0, host, () => {
          const addr = srv.address() as { port: number };
          serverInstance = srv;
          resolve(addr.port);
        });
        return;
      }
      reject(err);
    });
    srv.listen(port, host, () => {
      serverInstance = srv;
      const addr = srv.address() as { port: number };
      resolve(addr.port);
    });
  });
}

export function stopProxy(): void {
  if (serverInstance) {
    try { serverInstance.close(); } catch {}
    serverInstance = null;
  }
}
