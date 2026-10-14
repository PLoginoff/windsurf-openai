/**
 * Model power rankings + OpenRouter reference prices.
 *
 * Windsurf publishes credits-per-prompt but no benchmarks, and its per-1M
 * "extra usage" prices only apply beyond your plan's credit allowance.
 * OpenRouter's public /api/v1/models (no key needed) carries both:
 *   benchmarks.artificial_analysis { intelligence_index, coding_index } (0-100)
 *   pricing.prompt / pricing.completion (USD per token — multiply by 1M)
 *
 * At proxy startup we fetch OR once, cache for RANKS_TTL_MS, and use it for
 * the `recommend` CLI command (best power-per-buck right now). The mapping
 * below is manual because Windsurf uids are Cognition-internal; new models
 * simply show up with no rank until the table is extended.
 */
import * as fs from "fs";
import * as path from "path";

export interface OrModelInfo {
  orId: string;
  /** Artificial Analysis power score 0-100: coding_index ?? intelligence_index. */
  score?: number;
  /** USD per 1M input tokens on OpenRouter (reference "real market" price). */
  inputPer1M?: number;
  /** USD per 1M output tokens on OpenRouter. */
  outputPer1M?: number;
}

const OR_MODELS_URL = "https://openrouter.ai/api/v1/models";
const RANKS_FETCH_TIMEOUT_MS = 10_000;
export const RANKS_TTL_MS = 12 * 60 * 60 * 1000;

/** Windsurf model_uid base → OpenRouter id. `:variant`/`-fast` suffixes and
 *  effort levels (-low/-medium/-high/…) don't change the underlying model,
 *  so variants map to the same OR entry. Extend as Cognition adds models. */
const WINDSURF_TO_OR: Record<string, string> = {
  // Anthropic
  "claude-opus-5-5": "anthropic/claude-opus-5.5",
  "claude-sonnet-5-5": "anthropic/claude-sonnet-5.5",
  "claude-haiku-5-5": "anthropic/claude-haiku-5.5",
  "claude-fable-5-1": "anthropic/claude-fable-5.1",
  "claude-5-fable": "anthropic/claude-fable-5.1",
  "claude-opus-5": "anthropic/claude-opus-5",
  "claude-sonnet-5": "anthropic/claude-sonnet-5",
  "claude-opus-4-8": "anthropic/claude-opus-4.8",
  "claude-opus-4-7": "anthropic/claude-opus-4.7",
  "claude-opus-4-6": "anthropic/claude-opus-4.6",
  "claude-sonnet-4-6": "anthropic/claude-sonnet-4.6",
  "claude-opus-4-5": "anthropic/claude-opus-4.5",
  "claude-4-5-opus": "anthropic/claude-opus-4.5", // legacy MODEL_CLAUDE_4_5_OPUS(_THINKING)
  // OpenAI
  "gpt-5-5": "openai/gpt-5.5",
  "gpt-5-4-mini": "openai/gpt-5.4-mini",
  "gpt-5-4": "openai/gpt-5.4",
  "gpt-5-3-codex": "openai/gpt-5.3-codex",
  "gpt-5-2-codex": "openai/gpt-5.2-codex",
  "gpt-5-2": "openai/gpt-5.2", // legacy MODEL_GPT_5_2_*
  // Google
  "gemini-3-8-flash": "google/gemini-3.8-flash",
  "gemini-3-7-flash": "google/gemini-3.8-flash", // closest tracked sibling
  "gemini-3-6-flash": "google/gemini-3.5-flash",
  "gemini-3-5-flash": "google/gemini-3.5-flash",
  "gemini-3-1-pro": "google/gemini-3.1-pro-preview",
  "gemini-3-0-flash": "google/gemini-3-flash-preview", // legacy MODEL_GOOGLE_GEMINI_3_0_FLASH_*
  "google-gemini-3-0-flash": "google/gemini-3-flash-preview",
  "google-gemini-2-5-pro": "google/gemini-2.5-pro",
  // Z.AI / Moonshot / xAI / DeepSeek / NVIDIA
  "glm-5-3-flash": "z-ai/glm-5.3-flash",
  "glm-5-3": "z-ai/glm-5.3",
  "glm-5-2": "z-ai/glm-5.2",
  "kimi-k3": "moonshotai/kimi-k3",
  "kimi-k2-6": "moonshotai/kimi-k2.6",
  "kimi-k2-7": "moonshotai/kimi-k2.7-code",
  "grok-4-5": "x-ai/grok-4.5",
  "grok-4-6": "x-ai/grok-4.6",
  "grok-4-7": "x-ai/grok-4.7",
  "xai-grok-3": "x-ai/grok-4.5", // legacy MODEL_XAI_GROK_3: not on OR, closest tracked
  "xai-grok-3-mini": "x-ai/grok-4.5",
  "deepseek-v4-1-flash": "deepseek/deepseek-v4.1-flash",
  "deepseek-v4-flash": "deepseek/deepseek-v4-flash-0731",
  "deepseek-v4-pro": "deepseek/deepseek-v4-pro-0813",
  "nemotron-3-ultra": "nvidia/nemotron-3-ultra-550b-a55b",
  // OpenAI legacy (MODEL_CHAT_O3*, MODEL_CHAT_GPT_4*, gpt-4.1)
  "chat-o3": "openai/o3",
  "chat-gpt-4-1": "openai/gpt-4.1",
  "chat-gpt-4-1-2025-04-14": "openai/gpt-4.1",
  "chat-gpt-4o": "openai/gpt-4o-2024-08-06",
  "chat-gpt-4o-2024-08-06": "openai/gpt-4o-2024-08-06",
};

interface OrCatalog {
  byId: Map<string, OrModelInfo>;
  fetchedAt: number;
}

let cached: OrCatalog | null = null;
let inFlight: Promise<OrCatalog> | null = null;

interface OrRawModel {
  id: string;
  pricing?: { prompt?: string; completion?: string };
  benchmarks?: {
    artificial_analysis?: { intelligence_index?: number; coding_index?: number };
  };
}

async function fetchOrCatalog(): Promise<OrCatalog> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(new Error("OpenRouter fetch timeout")), RANKS_FETCH_TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(OR_MODELS_URL, {
      signal: ac.signal,
      headers: { "User-Agent": "windsurf-openai (github.com/ploginoff/windsurf-openai)" },
    });
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) throw new Error(`OpenRouter HTTP ${resp.status}`);
  const json = (await resp.json()) as { data?: OrRawModel[] };
  const byId = new Map<string, OrModelInfo>();
  for (const m of json.data ?? []) {
    if (m.id.includes(":")) continue; // skip :batch / :free variants
    const aa = m.benchmarks?.artificial_analysis;
    const score = aa?.coding_index ?? aa?.intelligence_index;
    const inputPer1M = m.pricing?.prompt !== undefined ? Number(m.pricing.prompt) * 1_000_000 : undefined;
    const outputPer1M = m.pricing?.completion !== undefined ? Number(m.pricing.completion) * 1_000_000 : undefined;
    byId.set(m.id, {
      orId: m.id,
      score: score !== undefined && !Number.isNaN(score) ? score : undefined,
      inputPer1M: inputPer1M !== undefined && !Number.isNaN(inputPer1M) ? inputPer1M : undefined,
      outputPer1M: outputPer1M !== undefined && !Number.isNaN(outputPer1M) ? outputPer1M : undefined,
    });
  }
  return { byId, fetchedAt: Date.now() };
}

/** Live OpenRouter catalog (cached RANKS_TTL_MS). Null if unreachable. */
export async function getOrCatalog(): Promise<OrCatalog | null> {
  if (cached && Date.now() - cached.fetchedAt < RANKS_TTL_MS) return cached;
  if (inFlight) return inFlight;
  const promise = fetchOrCatalog().then(
    (r) => { cached = r; return r; },
    () => null, // network fail → no ranks this run, graceful
  );
  inFlight = promise;
  try { return await promise; } finally { if (inFlight === promise) inFlight = null; }
}

/** Map a Windsurf model_uid (with any effort/variant suffix) to OR info. */
export async function lookupOrInfo(uid: string): Promise<OrModelInfo | null> {
  const or = await getOrCatalog();
  if (!or) return null;
  const orId = WINDSURF_TO_OR[baseUid(uid)];
  if (!orId) return null;
  return or.byId.get(orId) ?? null;
}

/** Strip Windsurf suffixes: effort levels, -fast, :variant, -1m, legacy prefixes. */
export function baseUid(uid: string): string {
  let s = uid.toLowerCase();
  s = s.replace(/^model_/, "");                       // legacy MODEL_GPT_5_2_LOW
  s = s.replace(/_/g, "-");                           // legacy underscores — before suffix strip
  s = s.replace(/:.*$/, "");                          // :high / :low-priority
  s = s.replace(/-(low|medium|high|xhigh|max|minimal|none|thinking|reasoning)(?=-|$)/g, "");
  s = s.replace(/-(fast|priority|1m)$/g, "");
  return s;
}

// ----------------------------------------------------------------------------
// Manual fallback ranks (SWE models are Cognition-internal, not on OpenRouter)
// ----------------------------------------------------------------------------

/** Rough power scores for models with no OR counterpart.
 * SWE models are Cognition's internal agentic workhorses: solid at tool use
 * and fast, but not heavyweight reasoning models compared to frontier LLMs. */
const MANUAL_SCORES: Record<string, number> = {
  "swe-2": 50,
  "swe-1-7": 42,
  "swe-1-7-lightning": 39,
  "swe-1-6": 33,
};

export function manualScore(uid: string): number | undefined {
  return MANUAL_SCORES[baseUid(uid)];
}

// ----------------------------------------------------------------------------
// ranks.json — optional user overrides next to the CLI
// ----------------------------------------------------------------------------
// Format: { "claude-opus-5-5-max": 58, "some-new-model": 42 }
// Wins over everything; lets you score brand-new models before they hit OR.

let userRanksCache: Record<string, number> | null = null;

function loadUserRanks(): Record<string, number> {
  if (userRanksCache) return userRanksCache;
  userRanksCache = {};
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "ranks.json"), "utf8")) as Record<string, unknown>;
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "number" && Number.isFinite(v)) userRanksCache[k] = v;
    }
  } catch { /* no ranks.json — fine */ }
  return userRanksCache;
}

export function userRankOverride(uid: string): number | undefined {
  return loadUserRanks()[uid] ?? loadUserRanks()[baseUid(uid)];
}

/** Best-known power score for a Windsurf uid: ranks.json > OpenRouter > manual SWE table. */
export async function powerScore(uid: string): Promise<number | undefined> {
  return userRankOverride(uid)
    ?? (await lookupOrInfo(uid))?.score
    ?? manualScore(uid);
}
