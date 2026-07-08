/**
 * Windsurf Provider for Pi
 *
 * Enables Windsurf/Cognition models via cloud-direct API.
 *
 * Usage: /login windsurf → /model windsurf/<id>
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { OAuthCredentials, OAuthLoginCallbacks } from "@earendil-works/pi-ai";
import { startProxy, stopProxy, PROXY_SECRET, setProxyCredentials } from "./proxy";
import { loadCredentials, saveCredentials, deleteCredentials, DEFAULT_REGION, runLoginLoopback, registerUser, type PersistedCredentials } from "./oauth";
import { clearCachedUserJwt } from "./auth";
import { clearSessionIds } from "./chat";
import { clearCachedCatalog, getCachedCatalog } from "./catalog";

let _pi: ExtensionAPI | null = null;
let _baseUrl: string | null = null;

const STATIC_MODELS = [
  { id: "claude-opus-4.7:medium", name: "Claude Opus 4.7 Medium", reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 }, contextWindow: 1000000, maxTokens: 128000 },
  { id: "claude-opus-4.7:high",   name: "Claude Opus 4.7 High",   reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 }, contextWindow: 1000000, maxTokens: 128000 },
  { id: "claude-opus-4.7:xhigh",  name: "Claude Opus 4.7 XHigh",  reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 }, contextWindow: 1000000, maxTokens: 128000 },
  { id: "claude-opus-4.7:max",    name: "Claude Opus 4.7 Max",    reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 }, contextWindow: 1000000, maxTokens: 128000 },
  { id: "claude-opus-4.6:thinking", name: "Claude Opus 4.6 Thinking", reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 }, contextWindow: 1000000, maxTokens: 128000 },
  { id: "gpt-5.5:low",            name: "GPT-5.5 Low",            reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 2.5, output: 10, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1050000, maxTokens: 128000 },
  { id: "gpt-5.5:medium",         name: "GPT-5.5 Medium",         reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 2.5, output: 10, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1050000, maxTokens: 128000 },
  { id: "gpt-5.5:high",           name: "GPT-5.5 High",           reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 2.5, output: 10, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1050000, maxTokens: 128000 },
  { id: "gpt-5.5:xhigh",          name: "GPT-5.5 XHigh",          reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 2.5, output: 10, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1050000, maxTokens: 128000 },
  { id: "gpt-5.4:low",            name: "GPT-5.4 Low",            reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 2.5, output: 10, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1050000, maxTokens: 128000 },
  { id: "gpt-5.4:medium",         name: "GPT-5.4 Medium",         reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 2.5, output: 10, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1050000, maxTokens: 128000 },
  { id: "gpt-5.4:high",           name: "GPT-5.4 High",           reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 2.5, output: 10, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1050000, maxTokens: 128000 },
  { id: "gpt-5.3-codex:low",      name: "GPT-5.3-Codex Low",      reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 2.5, output: 10, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1050000, maxTokens: 128000 },
  { id: "gpt-5.3-codex:medium",   name: "GPT-5.3-Codex Medium",   reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 2.5, output: 10, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1050000, maxTokens: 128000 },
  { id: "gpt-5.3-codex:high",     name: "GPT-5.3-Codex High",     reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 2.5, output: 10, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1050000, maxTokens: 128000 },
  { id: "gemini-3.5-flash:minimal",name:"Gemini 3.5 Flash Minimal",reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1048576, maxTokens: 65536 },
  { id: "gemini-3.5-flash:low",   name: "Gemini 3.5 Flash Low",   reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1048576, maxTokens: 65536 },
  { id: "gemini-3.5-flash:medium",name: "Gemini 3.5 Flash Medium",reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1048576, maxTokens: 65536 },
  { id: "gemini-3.5-flash:high",  name: "Gemini 3.5 Flash High",  reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1048576, maxTokens: 65536 },
  { id: "gemini-3.1-pro:low",     name: "Gemini 3.1 Pro Low",     reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1048576, maxTokens: 65536 },
  { id: "gemini-3.1-pro:high",    name: "Gemini 3.1 Pro High",    reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1048576, maxTokens: 65536 },
  { id: "kimi-k2.6",              name: "Kimi K2.6",               reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 262144, maxTokens: 262144 },
  { id: "swe-1.6:base",           name: "SWE-1.6",                 reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1000000, maxTokens: 128000 },
  { id: "swe-1.6:fast",           name: "SWE-1.6 Fast",           reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1000000, maxTokens: 128000 },
  { id: "deepseek-v4",            name: "DeepSeek V4",             reasoning: true, input: ["text"] as ("text"|"image")[], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1000000, maxTokens: 384000 },
  { id: "gpt-5.4-mini:low",       name: "GPT-5.4 Mini Low",       reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 0.15, output: 0.6, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1050000, maxTokens: 128000 },
  { id: "gpt-5.4-mini:medium",    name: "GPT-5.4 Mini Medium",    reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 0.15, output: 0.6, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1050000, maxTokens: 128000 },
  { id: "gpt-5.4-mini:high",      name: "GPT-5.4 Mini High",      reasoning: true, input: ["text","image"] as ("text"|"image")[], cost: { input: 0.15, output: 0.6, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1050000, maxTokens: 128000 },
];

function mc(m: typeof STATIC_MODELS[number]) {
  return { id: m.id, name: m.name, reasoning: m.reasoning, input: m.input, cost: m.cost, contextWindow: m.contextWindow, maxTokens: m.maxTokens };
}

// Build merged models list: static fallback + live catalog entries
function buildModels(catalog: Awaited<ReturnType<typeof getCachedCatalog>>): ReturnType<typeof mc>[] {
  const models = new Map<string, ReturnType<typeof mc>>();
  // Static models as base
  for (const m of STATIC_MODELS) models.set(m.id, mc(m));
  // Catalog entries: add models not already in static list, skip disabled
  if (catalog) {
    for (const [uid, entry] of catalog.byUid) {
      if (entry.disabled) continue;
      if (models.has(uid)) continue;
      models.set(uid, {
        id: uid,
        name: entry.label || uid,
        reasoning: true,
        input: ["text", "image"] as ("text" | "image")[],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 200000,
        maxTokens: 128000,
      });
    }
  }
  return [...models.values()];
}

// Register or update the windsurf provider with current models
function registerWindsurfProvider(pi: ExtensionAPI, baseUrl: string, catalog: Awaited<ReturnType<typeof getCachedCatalog>>): void {
  pi.registerProvider("windsurf", {
    name: "Cognition (Windsurf)",
    baseUrl,
    apiKey: PROXY_SECRET,
    api: "openai-completions",
    authHeader: true,
    models: buildModels(catalog),
    oauth: {
      name: "Windsurf (Cognition)",
      login: loginWindsurf,
      refreshToken: refreshWindsurfToken,
      getApiKey: (creds: OAuthCredentials) => creds.access,
    },
  });
}

// OAuth
async function loginWindsurf(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials> {
  let token: string;
  try {
    token = await runLoginLoopback(DEFAULT_REGION, (url) => callbacks.onAuth({ url }));
  } catch {
    const pasted = await callbacks.onPrompt({
      message: `Open this URL, sign in, paste callback URL or token:\n\n  ${DEFAULT_REGION.website}/windsurf/signin\n\nPaste:`,
    });
    const trimmed = pasted.trim();
    try {
      const u = new URL(trimmed);
      token = u.searchParams.get("firebase_id_token") ?? u.searchParams.get("access_token") ?? u.searchParams.get("token") ?? trimmed;
    } catch { token = trimmed; }
  }
  if (!token) throw new Error("No token received.");

  const result = await registerUser(token, DEFAULT_REGION);
  saveCredentials({ ...result, issuedAt: new Date().toISOString(), oauthClientId: DEFAULT_REGION.oauthClientId });
  setProxyCredentials({ apiKey: result.apiKey, apiServerUrl: result.apiServerUrl });
  clearCachedUserJwt();
  clearSessionIds();
  clearCachedCatalog();

  // Re-register provider with live catalog after login
  if (_pi && _baseUrl) {
    try {
      const freshCatalog = await getCachedCatalog(result.apiKey, result.apiServerUrl);
      registerWindsurfProvider(_pi, _baseUrl, freshCatalog);
    } catch {}
  }

  return { refresh: result.apiKey, access: result.apiKey, expires: Date.now() + 365 * 24 * 60 * 60 * 1000 };
}

async function refreshWindsurfToken(c: OAuthCredentials): Promise<OAuthCredentials> { return c; }

// Extension entry
export default async function (pi: ExtensionAPI) {
  _pi = pi;

  const proxyPort = await startProxy();
  const baseUrl = `http://127.0.0.1:${proxyPort}/v1`;
  _baseUrl = baseUrl;

  let hasCreds = false;
  let catalog = null;
  try {
    const stored = loadCredentials();
    if (stored) {
      setProxyCredentials({ apiKey: stored.apiKey, apiServerUrl: stored.apiServerUrl });
      hasCreds = true;
      // Fetch live catalog if creds available
      try { catalog = await getCachedCatalog(stored.apiKey, stored.apiServerUrl); } catch {}
    }
  } catch {}

  registerWindsurfProvider(pi, baseUrl, catalog);

  const catalogCount = catalog ? catalog.byUid.size : 0;
  console.error(hasCreds ? `[windsurf] connected (${catalogCount} catalog models)` : `[windsurf] /login windsurf to connect`);

  pi.registerCommand("windsurf-status", {
    description: "Show Windsurf auth status",
    handler: async (_args, ctx) => {
      const c = loadCredentials();
      ctx.ui.notify(c ? `Windsurf: authenticated (${c.apiServerUrl})` : "Windsurf: not signed in. /login windsurf", c ? "info" : "warning");
    },
  });

  pi.registerCommand("windsurf-logout", {
    description: "Sign out of Windsurf",
    handler: async (_args, ctx) => {
      const ok = deleteCredentials();
      setProxyCredentials(null);
      clearCachedUserJwt(); clearSessionIds(); clearCachedCatalog();
      ctx.ui.notify(ok ? "Windsurf: signed out." : "Already signed out.", "info");
    },
  });

  pi.registerCommand("windsurf-refresh", {
    description: "Refresh Windsurf model catalog",
    handler: async (_args, ctx) => {
      const c = loadCredentials();
      if (!c) {
        ctx.ui.notify("Windsurf: not signed in. /login windsurf", "warning");
        return;
      }
      clearCachedCatalog();
      try {
        const freshCatalog = await getCachedCatalog(c.apiKey, c.apiServerUrl);
        registerWindsurfProvider(pi, baseUrl, freshCatalog);
        const count = freshCatalog ? freshCatalog.byUid.size : 0;
        ctx.ui.notify(`Windsurf: refreshed ${count} models.`, "info");
      } catch (e) {
        ctx.ui.notify(`Windsurf: refresh error - ${e instanceof Error ? e.message : String(e)}`, "error");
      }
    },
  });

  pi.on("session_shutdown", async () => { _pi = null; _baseUrl = null; stopProxy(); });
}
