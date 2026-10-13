/**
 * Cost tiers for the model list.
 *
 * Windsurf publishes no pricing, but its GetUserStatus RPC returns per-model
 * credits-per-prompt and promo windows — the single source of truth used here.
 * Users can override tiers via a tiers.json file next to the CLI.
 */

import * as fs from "fs";
import * as path from "path";

export type PriceTier = "free" | "promo" | "$" | "$$" | "$$$" | "unknown";

export interface UsageSummary {
  promptTokens?: number;
  completionTokens?: number;
  cachedInputTokens?: number;
  cacheCreationInputTokens?: number;
}

/**
 * Tier from Windsurf's own credits-per-prompt (GetUserStatus).
 * Observed range: GLM=1 … GPT-6 Astra=200.
 * The ONLY source allowed to say "free" (together with active promo windows).
 */
export function tierFromCredits(credits: number): PriceTier {
  if (credits <= 0) return "free";
  if (credits < 10) return "$";
  if (credits < 100) return "$$";
  return "$$$";
}

/** Tier badge appended to a model display name: " $$" / " free" / " promo" / " unknown". */
export function tierAnnotation(tier: PriceTier): string {
  return ` ${tier}`;
}

/**
 * Strip a trailing cost annotation from a model id/name sent back by a client.
 * Handles tier badges (incl. "promo"/"unknown") and legacy dollar/plan/included forms.
 */
export function stripCostAnnotation(s: string): string {
  return s
    // current format: "Name ★76 $" — bare tier after the rank
    .replace(/\s+\${1,3}\s*$/, "")
    .replace(/\s+(free|promo|unknown)\s*$/, "")
    // legacy parenthesized format: "Name ($)" / "Name ★76 ($)"
    .replace(/\s*\(\${1,3}\)\s*$/, "")
    .replace(/\s*\((free|promo|unknown|plan|included)\)\s*$/, "")
    .replace(/\s*\(≈?\$[\d.]+\/\$[\d.]+\s+per\s+1M\)\s*$/, "")
    .replace(/\s*\u2605\d+\s*$/, "");                        // rank badge " ★76" (last)
}

// Human-readable name from a raw model_uid, e.g.
// "claude-opus-5-5-medium" → "Claude Opus 5.5 Medium". Used when a catalog
// entry has no label of its own.
const ACRONYMS = new Set(["gpt", "swe", "kimi", "glm"]);
const WORD_OVERRIDES: Record<string, string> = { deepseek: "DeepSeek" };

function titleizeWord(w: string): string {
  const lower = w.toLowerCase();
  if (WORD_OVERRIDES[lower]) return WORD_OVERRIDES[lower];
  if (ACRONYMS.has(lower)) return lower.toUpperCase();
  return w.charAt(0).toUpperCase() + w.slice(1);
}

const NUMERIC_RE = /^\d+(\.\d+)*$/;

export function titleizeModelId(id: string): string {
  return id
    .split(":")
    .map(part => {
      const words = part.split("-").map(titleizeWord);
      // Merge consecutive numeric tokens into a version: "5-5" → "5.5"
      const out: string[] = [];
      for (const w of words) {
        const prev = out[out.length - 1];
        if (prev !== undefined && /^\d+$/.test(w) && NUMERIC_RE.test(prev)) {
          out[out.length - 1] = `${prev}.${w}`;
        } else {
          out.push(w);
        }
      }
      return out.join(" ");
    })
    .join(" ");
}

// ----------------------------------------------------------------------------
// Devin Local-only models (hidden from the model list)
// ----------------------------------------------------------------------------
// GetUserStatus returns ALL models, but the chat endpoint rejects some with
// "This model is only in Devin Local" (verified by live-probing every uid on
// 2026-10-13: the entire gpt-5-6-* and gpt-6-{astra,sol,luna}-* lineups).
// There is no flag in the status payload, so we hide them by pattern.
// A tiers.json entry (any tier value) for a matching uid re-enables it.

const DEVIN_LOCAL_UID_PREFIXES = ["gpt-5-6-", "gpt-6-"];
const BROKEN_UIDS = new Set(["model_gpt_oss_120b"]); // server rejects: "issue with this request"

// ----------------------------------------------------------------------------
// User overrides — tiers.json in the working directory
// ----------------------------------------------------------------------------
// Brand-new models may lack credits data; this lets you assign tiers yourself.
// Format (exact id or prefix with `*`):
//   {
//     "claude-fable-5-1-medium": "$$",
//     "gpt-5-3-codex-*": "$$",
//     "gpt-6-experimental": "unknown"
//   }
// Values: "free" | "promo" | "$" | "$$" | "$$$" | "unknown" | "blocked".
// Special value "blocked" hides a model from the list entirely; conversely,
// any tier value for a Devin Local-pattern uid re-enables it.
// Overrides win over live Windsurf data; restart the proxy to pick up edits.

export type UserTierValue = "free" | "promo" | "$" | "$$" | "$$$" | "unknown" | "blocked";

let userTiersCache: Array<[key: string, tier: UserTierValue]> | null = null;

function loadUserTiers(): Array<[string, UserTierValue]> {
  if (userTiersCache) return userTiersCache;
  userTiersCache = [];
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "tiers.json"), "utf8")) as Record<string, unknown>;
    for (const [key, value] of Object.entries(raw)) {
      if (value === "free" || value === "promo" || value === "$" || value === "$$" || value === "$$$" || value === "unknown" || value === "blocked") {
        userTiersCache.push([key, value]);
      }
    }
  } catch { /* no tiers.json or malformed — fine */ }
  return userTiersCache;
}

/** tiers.json lookup: exact id → exact base → longest `*` prefix. Undefined = no override. */
export function userTierOverride(id: string): UserTierValue | undefined {
  const base = id.split(":")[0];
  const overrides = loadUserTiers();
  for (const scope of [id, base]) {
    for (const [key, value] of overrides) {
      if (key === scope) return value;
    }
  }
  const prefixes = overrides.filter(([k]) => k.endsWith("*")).sort((a, b) => b[0].length - a[0].length);
  for (const [key, value] of prefixes) {
    if (base.startsWith(key.slice(0, -1))) return value;
  }
  return undefined;
}

/** True if the model should be hidden from the list (Devin Local-only, broken,
 *  or "blocked" in tiers.json). An explicit tiers.json tier re-enables it. */
export function isBlockedModel(uid: string): boolean {
  const override = userTierOverride(uid);
  if (override === "blocked") return true;
  if (override !== undefined) return false;
  const base = uid.split(":")[0].toLowerCase();
  if (BROKEN_UIDS.has(base)) return true;
  return DEVIN_LOCAL_UID_PREFIXES.some(p => base.startsWith(p));
}
