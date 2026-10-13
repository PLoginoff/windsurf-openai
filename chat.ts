/**
 * Cloud-direct streaming chat. Translates OpenAI chat requests → Cognition Connect-RPC
 * GetChatMessage wire format, streams responses back as SSE events.
 */
import * as crypto from "crypto";
import * as zlib from "zlib";
import {
  encodeMessage,
  encodeString,
  encodeVarintField,
  frameConnectStream,
  iterFields,
} from "./wire";
import { buildMetadata } from "./metadata";
import { getCachedUserJwt } from "./auth";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

const CLOUD_STREAM_IDLE_MS = 120_000;
const CLOUD_STREAM_TTFB_MS = 60_000;

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; mimeType: string; base64Data: string; caption?: string };

export interface ChatHistoryItem {
  role: "user" | "assistant" | "system" | "tool";
  content: string | ContentPart[];
  tool_call_id?: string;
  tool_calls?: Array<{ id: string; name: string; arguments: string }>;
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: unknown;
}

export type CloudChatEvent =
  | { kind: "text"; text: string }
  | { kind: "reasoning"; text: string }
  | { kind: "tool_call_start"; id: string; name: string }
  | { kind: "tool_call_args"; argsDelta: string; id?: string }
  | { kind: "finish"; reason: "stop" | "tool_calls" | "length" | "content_filter" }
  | { kind: "usage"; promptTokens?: number; completionTokens?: number; totalTokens?: number;
      cachedInputTokens?: number; cacheCreationInputTokens?: number; reasoningTokens?: number; };

export interface CloudChatRequest {
  apiKey: string;
  apiServerUrl?: string;
  modelUid: string;
  messages: ChatHistoryItem[];
  tools?: ToolDef[];
  cascadeId?: string;
  completionOpts?: { maxOutputTokens?: number; maxInputTokens?: number; temperature?: number; topK?: number; topP?: number; };
  requestType?: number;
  signal?: AbortSignal;
}

export class CloudChatError extends Error {
  public readonly code?: string;
  public readonly traceId?: string;
  constructor(message: string, code?: string, traceId?: string) {
    super(message);
    this.name = "CloudChatError";
    this.code = code;
    this.traceId = traceId;
  }
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function anySignal(signals: AbortSignal[]): AbortSignal {
  const builtin = (AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any;
  if (typeof builtin === "function") return builtin(signals);
  const controller = new AbortController();
  const onAbort = (reason: unknown): void => {
    if (!controller.signal.aborted) controller.abort(reason);
  };
  for (const s of signals) {
    if (s.aborted) { onAbort(s.reason); break; }
    s.addEventListener("abort", () => onAbort(s.reason), { once: true });
  }
  return controller.signal;
}

// Session/cascade ID cache
interface SessionIds { sessionId: string; cascadeId: string; }
const sessionCache = new Map<string, SessionIds>();

function getOrAllocateSessionIds(apiKey: string, host: string, cascadeIdOverride?: string): SessionIds {
  const key = `${host}\x1f${apiKey}`;
  let ids = sessionCache.get(key);
  if (!ids) {
    ids = { sessionId: crypto.randomUUID(), cascadeId: cascadeIdOverride ?? crypto.randomUUID() };
    sessionCache.set(key, ids);
  } else if (cascadeIdOverride && ids.cascadeId !== cascadeIdOverride) {
    ids = { sessionId: ids.sessionId, cascadeId: cascadeIdOverride };
    sessionCache.set(key, ids);
  }
  return ids;
}

export function clearSessionIds(): void { sessionCache.clear(); }

// ----------------------------------------------------------------------------
// Content normalization
// ----------------------------------------------------------------------------

function normalizeContent(content: string | ContentPart[] | unknown): ContentPart[] {
  if (typeof content === "string") return [{ type: "text", text: content }];
  if (!Array.isArray(content)) return [];
  const out: ContentPart[] = [];
  const parts = content as Array<Record<string, unknown>>;
  for (const p of parts) {
    if (!p || typeof p !== "object") continue;
    if (p.type === "text" && typeof p.text === "string") {
      out.push({ type: "text", text: p.text });
    } else if (p.type === "image" && typeof p.base64Data === "string") {
      out.push({ type: "image", mimeType: (typeof p.mimeType === "string" ? p.mimeType : "image/png"), base64Data: p.base64Data, caption: typeof p.caption === "string" ? p.caption : undefined });
    } else if (p.type === "image_url" && p.image_url) {
      const imgRef = p.image_url as string | { url?: string };
      const url: string = typeof imgRef === "string" ? imgRef : (imgRef.url ?? "");
      const m = url.match(/^data:([^;]+);base64,(.+)$/);
      if (m) out.push({ type: "image", mimeType: m[1], base64Data: m[2] });
      else if (url) out.push({ type: "text", text: `[image url: ${url}]` });
    }
  }
  return out;
}

function collapseSystemIntoUser(messages: ChatHistoryItem[]): ChatHistoryItem[] {
  const out: ChatHistoryItem[] = [];
  let pendingSystem: string[] = [];
  const flushText = (c: ContentPart[]): string =>
    c.filter((p): p is { type: "text"; text: string } => p.type === "text").map(p => p.text).join("\n");

  for (const m of messages) {
    if (m.role === "system") {
      const parts = normalizeContent(m.content);
      const text = flushText(parts);
      if (text) pendingSystem.push(text);
    } else if (m.role === "user" && pendingSystem.length > 0) {
      const userParts = normalizeContent(m.content);
      const userText = flushText(userParts);
      const userImages = userParts.filter(p => p.type === "image");
      const wrapped = `<system>\n${pendingSystem.join("\n\n")}\n</system>\n${userText}`;
      out.push({ role: "user", content: [{ type: "text", text: wrapped }, ...userImages] });
      pendingSystem = [];
    } else {
      out.push(m);
    }
  }
  if (pendingSystem.length > 0) {
    out.push({ role: "user", content: [{ type: "text", text: `<system>\n${pendingSystem.join("\n\n")}\n</system>` }] });
  }
  return out;
}

// ----------------------------------------------------------------------------
// Proto encoders
// ----------------------------------------------------------------------------

const MAX_TOOL_DESC_LEN = 6998;

// ----------------------------------------------------------------------------
// Tool schema sanitization
// ----------------------------------------------------------------------------
// Cognition's Gemini routing chokes on JSON-Schema union types
// (e.g. `"type": ["string", "null"]` — Zed sends those for optional fields)
// and answers "There is an issue with this request". Flatten any type union
// to its first non-null member, recursively through the whole schema.

function sanitizeSchemaValue(v: unknown): unknown {
  if (Array.isArray(v)) {
    // "type" unions: ["string","null"] → "string"
    const nonNull = v.filter(t => t !== "null");
    if (nonNull.length === 1) return nonNull[0];
    if (nonNull.length === 0) return "string";
    return nonNull;
  }
  if (v && typeof v === "object") return sanitizeToolSchema(v as Record<string, unknown>);
  return v;
}

export function sanitizeToolSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === "type" && Array.isArray(v)) {
      out[k] = sanitizeSchemaValue(v);
    } else if (v && typeof v === "object") {
      out[k] = Array.isArray(v)
        ? (v as unknown[]).map(sanitizeSchemaValue)
        : sanitizeToolSchema(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function encodeToolDef(tool: ToolDef): Buffer {
  const rawDesc = tool.description ?? "";
  const desc = rawDesc.length > MAX_TOOL_DESC_LEN
    ? rawDesc.slice(0, MAX_TOOL_DESC_LEN - 24) + "\n…(truncated for cloud)"
    : rawDesc;
  const params = tool.parameters && typeof tool.parameters === "object"
    ? sanitizeToolSchema(tool.parameters as Record<string, unknown>)
    : {};
  return Buffer.concat([
    encodeString(1, tool.name),
    encodeString(2, desc),
    encodeString(3, JSON.stringify(params)),
  ]);
}

function encodeImageData(img: { mimeType: string; base64Data: string; caption?: string }): Buffer {
  const parts: Buffer[] = [encodeString(1, img.base64Data), encodeString(2, img.mimeType)];
  if (img.caption) parts.push(encodeString(3, img.caption));
  return Buffer.concat(parts);
}

function encodeChatToolCall(tc: { id: string; name: string; arguments: string }): Buffer {
  return Buffer.concat([encodeString(1, tc.id), encodeString(2, tc.name), encodeString(3, tc.arguments)]);
}

function encodeChatMessagePrompt(
  content: ContentPart[],
  source: number,
  opts?: { toolCallId?: string; toolCalls?: Array<{ id: string; name: string; arguments: string }> },
): Buffer {
  const textParts = content.filter((p): p is { type: "text"; text: string } => p.type === "text");
  const imageParts = content.filter((p): p is { type: "image"; mimeType: string; base64Data: string; caption?: string } => p.type === "image");
  const joined = textParts.map(p => p.text).join("\n");
  const parts: Buffer[] = [
    encodeVarintField(2, source),
    encodeString(3, joined),
    encodeVarintField(4, Math.max(1, Math.floor(joined.length / 4))),
    encodeVarintField(5, 1),
  ];
  if (opts?.toolCallId) parts.push(encodeString(7, opts.toolCallId));
  if (opts?.toolCalls && opts.toolCalls.length > 0) {
    for (const tc of opts.toolCalls) parts.push(encodeMessage(6, encodeChatToolCall(tc)));
  }
  for (const img of imageParts) parts.push(encodeMessage(10, encodeImageData(img)));
  return Buffer.concat(parts);
}

const SOURCE_BY_ROLE: Record<string, number> = { user: 1, assistant: 2, system: 1, tool: 4 };

function encodeCompletionConfiguration(opts: {
  maxOutputTokens?: number; maxInputTokens?: number; temperature?: number; topK?: number; topP?: number;
}): Buffer {
  const enc64 = (fieldNum: number, n: number): Buffer => {
    const b = Buffer.alloc(8);
    b.writeDoubleLE(n, 0);
    return Buffer.concat([Buffer.from([(fieldNum << 3) | 1]), b]);
  };
  return Buffer.concat([
    encodeVarintField(1, 1),
    encodeVarintField(2, opts.maxInputTokens ?? 64000),
    encodeVarintField(3, opts.maxOutputTokens ?? 128_000),
    enc64(5, opts.temperature ?? 0.7),
    enc64(6, opts.topP ?? 0.95),
    encodeVarintField(7, opts.topK ?? 50),
    enc64(8, 1.0),
    enc64(11, 1.0),
  ]);
}

export interface BuildArgs {
  apiKey: string; userJwt: string; modelUid: string; messages: ChatHistoryItem[];
  cascadeId: string; promptId: string; sessionId: string; requestId: bigint; triggerId: string;
  tools?: ToolDef[]; requestType?: number;
  completionOpts?: { maxOutputTokens?: number; maxInputTokens?: number; temperature?: number; topK?: number; topP?: number; };
}

export function buildGetChatMessageRequest(args: BuildArgs): Buffer {
  const metadata = buildMetadata({
    apiKey: args.apiKey, userJwt: args.userJwt, sessionId: args.sessionId,
    requestId: args.requestId, triggerId: args.triggerId,
  });
  const collapsed = collapseSystemIntoUser(args.messages);
  const promptParts = collapsed.map((m) =>
    encodeMessage(3, encodeChatMessagePrompt(
      normalizeContent(m.content),
      SOURCE_BY_ROLE[m.role] ?? 1,
      { toolCallId: m.role === "tool" ? m.tool_call_id : undefined, toolCalls: m.role === "assistant" ? m.tool_calls : undefined },
    )),
  );
  const completion = encodeCompletionConfiguration(args.completionOpts ?? {});
  const toolParts: Buffer[] = (args.tools ?? []).map((t) => encodeMessage(10, encodeToolDef(t)));
  return Buffer.concat([
    encodeMessage(1, metadata),
    ...promptParts,
    encodeVarintField(7, args.requestType ?? 5),
    encodeMessage(8, completion),
    ...toolParts,
    encodeString(16, args.cascadeId),
    encodeString(21, args.modelUid),
    encodeString(22, args.promptId),
  ]);
}

// ----------------------------------------------------------------------------
// Response decoding
// ----------------------------------------------------------------------------

export function* decodeChatFrame(proto: Buffer): Generator<CloudChatEvent> {
  for (const f of iterFields(proto)) {
    if (f.num === 3 && f.wire === 2 && Buffer.isBuffer(f.value)) {
      const s = (f.value as Buffer).toString("utf8");
      if (s) yield { kind: "text", text: s };
    } else if (f.num === 9 && f.wire === 2 && Buffer.isBuffer(f.value)) {
      const s = (f.value as Buffer).toString("utf8");
      if (s) yield { kind: "reasoning", text: s };
    } else if (f.num === 6 && f.wire === 2 && Buffer.isBuffer(f.value)) {
      let id: string | undefined;
      let name: string | undefined;
      let argsDelta: string | undefined;
      for (const sf of iterFields(f.value as Buffer)) {
        if (sf.wire === 2 && Buffer.isBuffer(sf.value)) {
          const s = (sf.value as Buffer).toString("utf8");
          if (sf.num === 1) id = s;
          else if (sf.num === 2) name = s;
          else if (sf.num === 3) argsDelta = s;
        }
      }
      if (id !== undefined && name !== undefined) yield { kind: "tool_call_start", id, name };
      if (argsDelta !== undefined) yield { kind: "tool_call_args", argsDelta, ...(id !== undefined ? { id } : {}) };
    } else if (f.num === 5 && f.wire === 0) {
      const v = Number(f.value);
      let reason: "stop" | "tool_calls" | "length" | "content_filter" = "stop";
      if (v === 10) reason = "tool_calls";
      else if (v === 11) reason = "content_filter";
      else if (v === 1 || v === 3) reason = "length";
      yield { kind: "finish", reason };
    } else if (f.num === 28 && f.wire === 2 && Buffer.isBuffer(f.value)) {
      const usage = decodeUsageBlock(f.value as Buffer);
      if (usage) yield usage;
    } else if (process.env.WINDSURF_DEBUG_USAGE) {
      console.error(`[windsurf] frame field num=${f.num} wire=${f.wire}${Buffer.isBuffer(f.value) ? ` len=${f.value.length}` : ` val=${f.value}`}`);
    }
  }
}

function decodeUsageBlock(buf: Buffer): CloudChatEvent | null {
  let promptTokens: number | undefined;
  let completionTokens: number | undefined;
  let cachedInputTokens: number | undefined;
  let cacheCreationInputTokens: number | undefined;
  let reasoningTokens: number | undefined;

  const debug = !!process.env.WINDSURF_DEBUG_USAGE;
  for (const f of iterFields(buf)) {
    if (f.num !== 2 || f.wire !== 2 || !Buffer.isBuffer(f.value)) {
      if (debug) console.error(`[windsurf] usage top-level field num=${f.num} wire=${f.wire}`);
      continue;
    }
    let entryMetric: string | undefined;
    let entryValue: number | undefined;
    for (const sf of iterFields(f.value as Buffer)) {
      if (debug) {
        const v = Buffer.isBuffer(sf.value)
          ? /[^ -~]/.test(sf.value.toString("latin1")) ? `hex:${sf.value.toString("hex").slice(0, 24)}` : sf.value.toString("utf8").slice(0, 40)
          : String(sf.value);
        console.error(`[windsurf] usage entry field num=${sf.num} wire=${sf.wire} val=${v}`);
      }
      if (sf.num === 5 && sf.wire === 2 && Buffer.isBuffer(sf.value)) {
        entryMetric = (sf.value as Buffer).toString("utf8");
      } else if (sf.num === 4 && sf.wire === 2 && Buffer.isBuffer(sf.value)) {
        for (const ssf of iterFields(sf.value as Buffer)) {
          if (ssf.num === 2 && ssf.wire === 5 && Buffer.isBuffer(ssf.value)) {
            entryValue = (ssf.value as Buffer).readFloatLE(0);
            break;
          }
        }
      }
    }
    if (entryMetric && entryValue !== undefined && Number.isFinite(entryValue)) {
      const n = Math.round(entryValue);
      if (entryMetric === "input_tokens") promptTokens = n;
      else if (entryMetric === "output_tokens") completionTokens = n;
      else if (entryMetric === "cached_input_tokens" || entryMetric === "cache_read_input_tokens") cachedInputTokens = (cachedInputTokens ?? 0) + n;
      else if (entryMetric === "cache_creation_input_tokens") cacheCreationInputTokens = (cacheCreationInputTokens ?? 0) + n;
      else if (entryMetric === "reasoning_tokens" || entryMetric === "output_reasoning_tokens") reasoningTokens = (reasoningTokens ?? 0) + n;
    }
  }
  if (promptTokens === undefined && completionTokens === undefined) return null;
  return { kind: "usage", promptTokens, completionTokens, totalTokens: (promptTokens ?? 0) + (completionTokens ?? 0), cachedInputTokens, cacheCreationInputTokens, reasoningTokens };
}

// ----------------------------------------------------------------------------
// Public API: streamChatEvents
// ----------------------------------------------------------------------------

const TRACE_ID_RE = /\(trace ID: ([0-9a-f]+)\)/i;

/** Errors worth retrying: Cognition's transient routing failures. */
function isTransientChatError(e: unknown): boolean {
  if (!(e instanceof CloudChatError)) return false;
  const m = e.message.toLowerCase();
  return (
    /issue with this request/.test(m) ||
    /an internal error occurred/.test(m) ||
    e.code === "unavailable" ||
    e.code === "internal"
  );
}

const CHAT_RETRIES = 2;
const CHAT_RETRY_DELAY_MS = 700;

/** streamChatEvents with up to 2 retries on transient Cognition errors
 *  ("There is an issue with this request" / internal errors). Only retries
 *  if nothing has been yielded to the client yet — mid-stream restarts
 *  would duplicate output. */
export async function* streamChatEventsWithRetry(req: CloudChatRequest): AsyncGenerator<CloudChatEvent> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= CHAT_RETRIES; attempt++) {
    let yielded = false;
    try {
      for await (const ev of streamChatEvents(req)) {
        yielded = true;
        yield ev;
      }
      return; // completed clean
    } catch (e) {
      lastError = e;
      if (yielded || !isTransientChatError(e) || req.signal?.aborted || attempt === CHAT_RETRIES) throw e;
      console.error(`[windsurf] transient chat error (attempt ${attempt + 1}/${CHAT_RETRIES + 1}), retrying in ${CHAT_RETRY_DELAY_MS}ms: ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
      await new Promise(r => setTimeout(r, CHAT_RETRY_DELAY_MS));
    }
  }
  throw lastError;
}

export async function* streamChatEvents(req: CloudChatRequest): AsyncGenerator<CloudChatEvent> {
  const host = (req.apiServerUrl ?? "https://server.codeium.com").replace(/\/$/, "");
  const userJwt = await getCachedUserJwt(req.apiKey, host, req.signal);
  const sessionIds = getOrAllocateSessionIds(req.apiKey, host, req.cascadeId);

  const proto = buildGetChatMessageRequest({
    apiKey: req.apiKey, userJwt, modelUid: req.modelUid, messages: req.messages,
    tools: req.tools, cascadeId: sessionIds.cascadeId, promptId: crypto.randomUUID(),
    sessionId: sessionIds.sessionId, requestId: BigInt(Date.now()), triggerId: crypto.randomUUID(),
    requestType: req.requestType, completionOpts: req.completionOpts,
  });
  const body = frameConnectStream(proto, true);

  const ttfbController = new AbortController();
  const ttfbTimer = setTimeout(() => ttfbController.abort(new Error(`TTFB timeout (${CLOUD_STREAM_TTFB_MS}ms)`)), CLOUD_STREAM_TTFB_MS);
  const ttfbSignal = ttfbController.signal;
  const initialSignal: AbortSignal = req.signal ? anySignal([req.signal, ttfbSignal]) : ttfbSignal;

  let resp: Response;
  try {
    resp = await fetch(`${host}/exa.api_server_pb.ApiServerService/GetChatMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/connect+proto",
        "Connect-Protocol-Version": "1",
        "Connect-Content-Encoding": "gzip",
        "Connect-Accept-Encoding": "gzip",
      },
      body,
      signal: initialSignal,
    });
  } finally {
    clearTimeout(ttfbTimer);
  }

  if (!resp.ok) {
    const text = await resp.text();
    throw new CloudChatError(`GetChatMessage HTTP ${resp.status}: ${text.slice(0, 300)}`);
  }
  if (!resp.body) throw new CloudChatError("GetChatMessage response had no body stream");

  const chunkQueue: Buffer[] = [];
  let queuedBytes = 0;
  const reader = resp.body.getReader() as ReadableStreamDefaultReader<Uint8Array>;
  let trailerError: { code?: string; message: string; traceId?: string } | null = null;
  let sawEos = false;

  function peek(n: number): Buffer | null {
    if (queuedBytes < n) return null;
    if (chunkQueue.length === 1 && chunkQueue[0].length >= n) return chunkQueue[0].slice(0, n);
    const parts: Buffer[] = [];
    let remaining = n;
    for (const c of chunkQueue) {
      if (remaining <= 0) break;
      if (c.length <= remaining) { parts.push(c); remaining -= c.length; }
      else { parts.push(c.slice(0, remaining)); remaining = 0; }
    }
    return Buffer.concat(parts, n);
  }

  function drop(n: number): void {
    queuedBytes -= n;
    let remaining = n;
    while (remaining > 0 && chunkQueue.length > 0) {
      const head = chunkQueue[0];
      if (head.length <= remaining) { chunkQueue.shift(); remaining -= head.length; }
      else { chunkQueue[0] = head.slice(remaining); remaining = 0; }
    }
  }

  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  try {
    const resetIdle = (): Promise<{ value?: Uint8Array; done: boolean }> => {
      if (idleTimer) clearTimeout(idleTimer);
      const idleController = new AbortController();
      idleTimer = setTimeout(
        () => idleController.abort(new Error(`Idle timeout (${CLOUD_STREAM_IDLE_MS}ms)`)),
        CLOUD_STREAM_IDLE_MS,
      );
      return new Promise((resolve, reject) => {
        let settled = false;
        const settle = (fn: () => void): void => { if (settled) return; settled = true; fn(); };
        const readP = reader.read();
        readP.catch(() => {});
        idleController.signal.addEventListener("abort", () => {
          try { void reader.cancel(idleController.signal.reason ?? new Error("idle abort")).catch(() => {}); } catch {}
          settle(() => reject(idleController.signal.reason ?? new Error("idle abort")));
        }, { once: true });
        readP.then(v => settle(() => resolve(v)), e => settle(() => reject(e)));
      });
    };

    while (true) {
      const { value, done } = await resetIdle();
      if (done) break;
      if (value) { chunkQueue.push(Buffer.from(value)); queuedBytes += value.length; }

      while (queuedBytes >= 5) {
        const header = peek(5);
        if (!header) break;
        const flags = header[0];
        const len = header.readUInt32BE(1);
        if (queuedBytes < 5 + len) break;
        drop(5);
        const raw = peek(len) ?? Buffer.alloc(0);
        drop(len);

        let payload = raw;
        if (flags & 0x01) {
          try { payload = zlib.gunzipSync(raw); }
          catch (gzipErr) { throw new CloudChatError(`Connect frame gunzip failed: ${(gzipErr as Error).message}`); }
        }
        const eos = (flags & 0x02) !== 0;

        if (eos) {
          sawEos = true;
          const text = payload.toString("utf8");
          if (text && text.includes('"error"')) {
            let code: string | undefined;
            let message = text;
            try {
              const j = JSON.parse(text) as { error?: { code?: string; message?: string } };
              code = j.error?.code;
              if (j.error?.message) message = j.error.message;
            } catch {}
            const traceMatch = message.match(TRACE_ID_RE);
            trailerError = { code, message, traceId: traceMatch?.[1] };
          }
          continue;
        }
        yield* decodeChatFrame(payload);
      }
    }
  } finally {
    if (idleTimer) clearTimeout(idleTimer);
    try { reader.releaseLock(); } catch {}
    try { void resp.body?.cancel(); } catch {}
  }

  if (trailerError) {
    const isOpaquePermissionDenial =
      trailerError.code === "permission_denied" && /an internal error occurred/i.test(trailerError.message);
    if (isOpaquePermissionDenial) {
      throw new CloudChatError(
        `Cognition denied this request for model "${req.modelUid}". This almost always means the model is not enabled for your account/tier. (trace ID: ${trailerError.traceId ?? "n/a"})`,
        trailerError.code, trailerError.traceId,
      );
    }
    throw new CloudChatError(trailerError.message, trailerError.code, trailerError.traceId);
  }
  if (!sawEos) {
    throw new CloudChatError(`Cloud stream ended without EOS trailer (${queuedBytes} bytes orphaned).`, "truncated_stream");
  }
}
