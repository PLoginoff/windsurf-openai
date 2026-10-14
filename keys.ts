/**
 * Multi-key access control — keys.json next to the CLI.
 *
 * Lets you hand out per-key proxies to friends with model restrictions:
 *   {
 *     "pashka":       { "max_credits": 0 },          // unrestricted (0 = no limit)
 *     "friend-vasya": { "max_credits": 10 }          // models costing ≤ 10 credits/prompt
 *   }
 * A key not present in the file (and not matching --key) → 401.
 * max_credits compares against Windsurf's credits-per-prompt for the
 * requested model; free/promo models always pass (cost 0).
 */
import * as fs from "fs";
import * as path from "path";

export interface KeyPolicy {
  /** Max credits-per-prompt allowed for this key. 0/undefined = unlimited. */
  max_credits?: number;
}

let cache: Map<string, KeyPolicy> | null = null;
let cachedMtime = 0;

function loadKeys(): Map<string, KeyPolicy> {
  const file = path.join(process.cwd(), "keys.json");
  try {
    const mtime = fs.statSync(file).mtimeMs;
    if (cache && mtime === cachedMtime) return cache;
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, KeyPolicy>;
    cache = new Map(Object.entries(raw).map(([k, v]) => [k.trim(), v ?? {}]));
    cachedMtime = mtime;
  } catch {
    cache = new Map();
  }
  return cache;
}

export function clearKeysCache(): void {
  cache = null;
}

/** Authenticate a presented Bearer token. Returns the policy, or null if unknown key. */
export function authenticateKey(presented: string): KeyPolicy | null {
  const keys = loadKeys();
  return keys.get(presented) ?? null;
}
