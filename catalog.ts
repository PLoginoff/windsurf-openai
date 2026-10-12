/**
 * Per-account model catalog from Cognition's GetCascadeModelConfigs.
 *
 * Fetches live model list at startup and after login. Used for:
 *   1. Dynamic model registration (new models appear automatically)
 *   2. Pre-flight availability check (reject disabled models before wasting a roundtrip)
 */
import * as crypto from "crypto";
import { buildMetadata } from "./metadata";
import { getCachedUserJwt, clearCachedUserJwt } from "./auth";
import { encodeMessage, iterFields } from "./wire";
import { clearSessionIds } from "./chat";

const CATALOG_TTL_MS = 10 * 60 * 1000;
const CATALOG_FETCH_TIMEOUT_MS = 10_000;

export interface ModelCatalogEntry {
  modelUid: string;
  label: string;
  disabled: boolean;
}

interface CacheEntry {
  byUid: Map<string, ModelCatalogEntry>;
  fetchedAt: number;
  apiKey: string;
  host: string;
}

let cached: CacheEntry | null = null;
let inFlight: Promise<CacheEntry> | null = null;
let inFlightKey: string | null = null;

function flightKey(apiKey: string, host: string): string {
  return `${host}\x1f${apiKey}`;
}

async function fetchCatalog(apiKey: string, host: string, signal?: AbortSignal): Promise<CacheEntry> {
  const userJwt = await getCachedUserJwt(apiKey, host, signal);

  const metadata = buildMetadata({
    apiKey, userJwt,
    sessionId: crypto.randomUUID(),
    requestId: BigInt(Date.now()),
    triggerId: crypto.randomUUID(),
  });
  const reqBody = encodeMessage(1, metadata);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(new Error(`catalog fetch timeout (${CATALOG_FETCH_TIMEOUT_MS}ms)`)), CATALOG_FETCH_TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(`${host}/exa.api_server_pb.ApiServerService/GetCascadeModelConfigs`, {
      method: "POST",
      headers: { "Content-Type": "application/proto", "Connect-Protocol-Version": "1" },
      body: reqBody,
      signal: ac.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`GetCascadeModelConfigs HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }
  const buf = Buffer.from(await resp.arrayBuffer());

  const byUid = new Map<string, ModelCatalogEntry>();
  for (const f of iterFields(buf)) {
    if (f.num !== 1 || f.wire !== 2 || !Buffer.isBuffer(f.value)) continue;
    let label = "";
    let modelUid = "";
    let disabled = false;
    for (const sf of iterFields(f.value as Buffer)) {
      if (sf.num === 1 && sf.wire === 2 && Buffer.isBuffer(sf.value)) {
        label = (sf.value as Buffer).toString("utf8");
      } else if (sf.num === 4 && sf.wire === 0) {
        disabled = sf.value === 1n;
      } else if (sf.num === 22 && sf.wire === 2 && Buffer.isBuffer(sf.value)) {
        modelUid = (sf.value as Buffer).toString("utf8");
      }
    }
    if (modelUid.length > 0) {
      byUid.set(modelUid, { modelUid, label: label || modelUid, disabled });
    }
  }

  return { byUid, fetchedAt: Date.now(), apiKey, host };
}

export async function getCachedCatalog(
  apiKey: string,
  host: string,
  signal?: AbortSignal,
): Promise<CacheEntry | null> {
  if (cached && cached.apiKey === apiKey && cached.host === host) {
    if (Date.now() - cached.fetchedAt < CATALOG_TTL_MS) return cached;
  }

  const key = flightKey(apiKey, host);
  if (inFlight && inFlightKey === key) {
    try { return await inFlight; } catch { return null; }
  }

  const promise = fetchCatalog(apiKey, host, signal);
  inFlight = promise;
  inFlightKey = key;
  try {
    const result = await promise;
    cached = result;
    return result;
  } catch {
    return null;
  } finally {
    if (inFlight === promise) { inFlight = null; inFlightKey = null; }
  }
}

export function clearCachedCatalog(): void {
  cached = null;
  inFlight = null;
  inFlightKey = null;
}
