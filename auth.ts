/**
 * Mint short-lived user_jwt for chat RPCs.
 *
 * POST https://server.codeium.com/exa.auth_pb.AuthService/GetUserJwt
 */
import * as crypto from "crypto";
import { encodeMessage, iterFields } from "./wire";
import { buildMetadata } from "./metadata";

const DEFAULT_HOST = "https://server.codeium.com";

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

export interface MintedUserJwt {
  jwt: string;
  expiresAt: number;
}

export class CloudAuthError extends Error {
  public readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "CloudAuthError";
    this.status = status;
  }
}

export async function mintUserJwt(
  apiKey: string,
  host: string = DEFAULT_HOST,
  signal?: AbortSignal,
): Promise<MintedUserJwt> {
  const metadata = buildMetadata({
    apiKey,
    sessionId: crypto.randomUUID(),
    requestId: BigInt(Date.now()),
    triggerId: crypto.randomUUID(),
  });
  const req = encodeMessage(1, metadata);

  const timeoutSignal = AbortSignal.timeout(30_000);
  const combinedSignal: AbortSignal = signal ? anySignal([signal, timeoutSignal]) : timeoutSignal;

  const resp = await fetch(`${host.replace(/\/$/, "")}/exa.auth_pb.AuthService/GetUserJwt`, {
    method: "POST",
    headers: { "Content-Type": "application/proto", "Connect-Protocol-Version": "1" },
    body: req,
    signal: combinedSignal,
  });
  const buf = Buffer.from(await resp.arrayBuffer());

  if (!resp.ok) {
    const text = buf.toString("utf8");
    throw new CloudAuthError(`GetUserJwt HTTP ${resp.status}: ${text.slice(0, 400)}`, resp.status);
  }

  let jwt: string | null = null;
  for (const f of iterFields(buf)) {
    if (f.num === 1 && f.wire === 2 && Buffer.isBuffer(f.value)) {
      const s = (f.value as Buffer).toString("utf8");
      if (/^eyJ[A-Za-z0-9_-]{10,}={0,2}\.[A-Za-z0-9_-]+={0,2}\.[A-Za-z0-9_-]+={0,2}$/.test(s)) {
        jwt = s;
        break;
      }
    }
  }
  if (!jwt) {
    throw new CloudAuthError(`GetUserJwt 200 but no field-1 JWT found (${buf.length} bytes)`);
  }

  let expiresAt = Math.floor(Date.now() / 1000) + 600;
  try {
    const parts = jwt.split(".");
    const pad = (s: string) => s + "=".repeat((4 - (s.length % 4)) % 4);
    const payload = JSON.parse(
      Buffer.from(pad(parts[1]).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    );
    if (typeof payload.exp === "number") expiresAt = payload.exp;
  } catch { /* fall back to default */ }

  return { jwt, expiresAt };
}

// ----------------------------------------------------------------------------
// In-memory cache
// ----------------------------------------------------------------------------

interface CacheEntry {
  jwt: string;
  expiresAt: number;
  apiKey: string;
  host: string;
}

let cache: CacheEntry | null = null;
const inFlight = new Map<string, Promise<MintedUserJwt>>();
let cacheEpoch = 0;

function flightKey(apiKey: string, host: string): string {
  return `${host}\x1f${apiKey}`;
}

export async function getCachedUserJwt(apiKey: string, host: string = DEFAULT_HOST, signal?: AbortSignal): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cache && cache.apiKey === apiKey && cache.host === host && cache.expiresAt > now + 60) {
    return cache.jwt;
  }
  const key = flightKey(apiKey, host);
  const existing = inFlight.get(key);
  if (existing) return (await existing).jwt;
  const promise = mintUserJwt(apiKey, host, signal);
  inFlight.set(key, promise);
  const epochAtStart = cacheEpoch;
  try {
    const minted = await promise;
    if (cacheEpoch === epochAtStart) {
      cache = { jwt: minted.jwt, expiresAt: minted.expiresAt, apiKey, host };
    }
    return minted.jwt;
  } finally {
    inFlight.delete(key);
  }
}

export function clearCachedUserJwt(): void {
  cache = null;
  inFlight.clear();
  cacheEpoch++;
}
