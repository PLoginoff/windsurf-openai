/**
 * GetUserStatus — the real per-account model list from Windsurf.
 *
 * This is the endpoint the Windsurf plugin uses for its model picker. It works
 * with just the apiKey (no JWT) and returns, for every model (f1.f33 entries):
 *   f1  label, f3 credits-per-prompt (float), f4 disabled, f18 context window,
 *   f22 model_uid, f23 routing/config (f13 max tokens, f18 api server),
 *   f32 repeated pricing rows: "Input"/"Cached input"/"Output" with USD per 1M
 *   tokens (extra-usage "API pricing") — f2 of each row.
 *
 * Note: GetCascadeModelConfigs returns 404 on self-serve hosts; this endpoint
 * is the reliable source.
 */
import * as crypto from "crypto";
import { buildMetadata } from "./metadata";
import { encodeMessage, iterFields, type ProtoField } from "./wire";

export interface ModelPricing {
  input?: number;
  cachedInput?: number;
  output?: number;
}

export interface UserStatusModel {
  uid: string;
  label: string;
  disabled: boolean;
  contextWindow?: number;
  maxTokens?: number;
  creditsPerPrompt?: number;
  pricing?: ModelPricing;
  apiServer?: string;
  /** Promo window end (epoch seconds) — field 19. The Windsurf plugin shows
   *  these models as "PROMO": free for the account while the window is open. */
  promoUntil?: number;
}

/** True while the model's promo window is open (what the plugin badges "PROMO"). */
export function isPromoActive(m: UserStatusModel, now = Date.now()): boolean {
  return m.promoUntil !== undefined && m.promoUntil * 1000 > now;
}

export interface UserStatus {
  models: Map<string, UserStatusModel>;
  planName?: string;
  fetchedAt: number;
}

const STATUS_TTL_MS = 10 * 60 * 1000;
const STATUS_FETCH_TIMEOUT_MS = 15_000;

let cached: UserStatus | null = null;
let inFlight: Promise<UserStatus> | null = null;

function readFloat(f: ProtoField): number | undefined {
  if (f.wire === 5 && Buffer.isBuffer(f.value) && (f.value as Buffer).length === 4) {
    return (f.value as Buffer).readFloatLE(0);
  }
  return undefined;
}

function parseModelEntry(buf: Buffer): UserStatusModel | null {
  let label = "";
  let uid = "";
  let disabled = false;
  let contextWindow: number | undefined;
  let maxTokens: number | undefined;
  let creditsPerPrompt: number | undefined;
  let apiServer: string | undefined;
  let pricing: ModelPricing | undefined;
  let promoUntil: number | undefined;

  for (const f of iterFields(buf)) {
    if (f.num === 1 && f.wire === 2 && Buffer.isBuffer(f.value)) {
      label = (f.value as Buffer).toString("utf8");
    } else if (f.num === 3) {
      creditsPerPrompt = readFloat(f);
    } else if (f.num === 4 && f.wire === 0) {
      disabled = f.value === 1n;
    } else if (f.num === 18 && f.wire === 0) {
      contextWindow = Number(f.value);
    } else if (f.num === 22 && f.wire === 2 && Buffer.isBuffer(f.value)) {
      uid = (f.value as Buffer).toString("utf8");
    } else if (f.num === 23 && f.wire === 2 && Buffer.isBuffer(f.value)) {
      for (const sf of iterFields(f.value as Buffer)) {
        if (sf.num === 13 && sf.wire === 0) maxTokens = Number(sf.value);
        else if (sf.num === 18 && sf.wire === 2 && Buffer.isBuffer(sf.value)) apiServer = (sf.value as Buffer).toString("utf8");
      }
    } else if (f.num === 19 && f.wire === 2 && Buffer.isBuffer(f.value)) {
      // Promo window: f1 = enabled flag, f2.f1 = end timestamp (epoch seconds).
      // Observed: SWE-2 → 2026-10-16 (matches "Free through October 16, 2026"),
      // Gemini 3.7/3.8 Flash → ~2027-01-01.
      for (const pf of iterFields(f.value as Buffer)) {
        if (pf.num === 2 && pf.wire === 2 && Buffer.isBuffer(pf.value)) {
          for (const tf of iterFields(pf.value as Buffer)) {
            if (tf.num === 1 && tf.wire === 0) promoUntil = Number(tf.value);
          }
        }
      }
    } else if (f.num === 32 && f.wire === 2 && Buffer.isBuffer(f.value)) {
      let metric = "";
      let price: number | undefined;
      for (const pf of iterFields(f.value as Buffer)) {
        if (pf.num === 1 && pf.wire === 2 && Buffer.isBuffer(pf.value)) metric = (pf.value as Buffer).toString("utf8");
        else if (pf.num === 2) price = readFloat(pf);
      }
      if (price !== undefined) {
        pricing = pricing ?? {};
        if (metric === "Input") pricing.input = price;
        else if (metric === "Cached input") pricing.cachedInput = price;
        else if (metric === "Output") pricing.output = price;
      }
    }
  }

  if (!uid) return null;
  return { uid, label: label || uid, disabled, contextWindow, maxTokens, creditsPerPrompt, pricing, apiServer, promoUntil };
}

/** Parse a raw GetUserStatus response body. Exported for tests/probes. */
export function parseUserStatusBuffer(buf: Buffer): UserStatus {
  const models = new Map<string, UserStatusModel>();
  let planName: string | undefined;

  for (const f of iterFields(buf)) {
    if (f.wire !== 2 || !Buffer.isBuffer(f.value)) continue;
    if (f.num === 1) {
      // UserStatus message: f33 = repeated model configs
      for (const sf of iterFields(f.value as Buffer)) {
        if (sf.num !== 33 || sf.wire !== 2 || !Buffer.isBuffer(sf.value)) continue;
        for (const mf of iterFields(sf.value as Buffer)) {
          if (mf.num !== 1 || mf.wire !== 2 || !Buffer.isBuffer(mf.value)) continue;
          const m = parseModelEntry(mf.value as Buffer);
          if (m) models.set(m.uid, m);
        }
      }
    } else if (f.num === 2) {
      // Plan info: f2 = plan name ("Pro")
      for (const sf of iterFields(f.value as Buffer)) {
        if (sf.num === 2 && sf.wire === 2 && Buffer.isBuffer(sf.value)) {
          planName = (sf.value as Buffer).toString("utf8");
        }
      }
    }
  }

  return { models, planName, fetchedAt: Date.now() };
}

async function fetchUserStatus(apiKey: string, host: string, signal?: AbortSignal): Promise<UserStatus> {
  const metadata = buildMetadata({
    apiKey,
    sessionId: crypto.randomUUID(),
    requestId: BigInt(Date.now()),
    triggerId: crypto.randomUUID(),
  });

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(new Error("GetUserStatus timeout")), STATUS_FETCH_TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(`${host.replace(/\/$/, "")}/exa.seat_management_pb.SeatManagementService/GetUserStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/proto", "Connect-Protocol-Version": "1" },
      body: encodeMessage(1, metadata),
      signal: signal ?? ac.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`GetUserStatus HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }
  return parseUserStatusBuffer(Buffer.from(await resp.arrayBuffer()));
}

export async function getUserStatus(apiKey: string, host: string, signal?: AbortSignal): Promise<UserStatus> {
  if (cached && Date.now() - cached.fetchedAt < STATUS_TTL_MS) return cached;
  if (inFlight) return inFlight;
  const promise = fetchUserStatus(apiKey, host, signal).then((result) => {
    cached = result;
    return result;
  });
  inFlight = promise;
  try {
    return await promise;
  } finally {
    if (inFlight === promise) inFlight = null;
  }
}

/** Sync access to the cached status (no fetch). Null until warmed. */
export function getCachedUserStatus(): UserStatus | null {
  return cached;
}

export function clearCachedUserStatus(): void {
  cached = null;
  inFlight = null;
}
