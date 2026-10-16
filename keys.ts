/**
 * Multi-key access control — keys.json next to the CLI.
 *
 *   {
 *     "my-secret-key": { "name": "me",           "max_credits": -1 },
 *     "vasya-key":     { "name": "friend-vasya", "max_credits": 10 }
 *   }
 *
 * Top-level key = the Bearer token clients send. `name` is only for the
 * serve startup log. max_credits limits the model list and chat to models
 * costing ≤ that many credits/prompt; free/promo always pass.
 *   -1 or missing = unlimited, 0 = free/promo only, N = ≤N credits/prompt.
 * Missing keys.json → localhost only, remote requests rejected.
 */
import * as fs from "fs";
import * as path from "path";

export interface KeyPolicy {
  /** Human label — used only in the serve startup log. */
  name?: string;
  /** Max credits-per-prompt allowed. -1/undefined = unlimited, 0 = free/promo only. */
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
    cache = new Map(
      Object.entries(raw)
        .filter(([k]) => typeof k === "string" && k.length > 0)
        .map(([k, v]) => [k.trim(), v ?? {}]),
    );
    cachedMtime = mtime;
  } catch {
    cache = new Map();
  }
  return cache;
}

export function clearKeysCache(): void {
  cache = null;
}

/** Snapshot of the loaded keys map — for the serve startup log. */
export function getKeys(): Map<string, KeyPolicy> {
  return loadKeys();
}

/** Number of configured keys — for the serve startup log. */
export function keyCount(): number {
  return loadKeys().size;
}

/** Resolve the effective credit limit for a policy. undefined = unlimited. */
export function creditLimit(policy: KeyPolicy): number | undefined {
  const m = policy.max_credits;
  return m === undefined || m < 0 ? undefined : m;
}

/** Authenticate a presented Bearer token. Returns the policy, or null if unknown key. */
export function authenticateKey(presented: string): KeyPolicy | null {
  const keys = loadKeys();
  return keys.get(presented) ?? null;
}
