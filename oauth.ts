/**
 * OAuth login + RegisterUser + credential storage.
 */
import * as http from "http";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { spawn } from "child_process";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface OAuthLoginResult {
  apiKey: string;
  name: string;
  apiServerUrl: string;
  redirectUrl?: string;
}

export interface WindsurfRegion {
  website: string;
  registerApiServerUrl: string;
  oauthClientId: string;
}

export const DEFAULT_REGION: WindsurfRegion = {
  website: "https://windsurf.com",
  registerApiServerUrl: "https://register.windsurf.com",
  oauthClientId: "3GUryQ7ldAeKEuD2obYnppsnmj58eP5u",
};

export interface PersistedCredentials extends OAuthLoginResult {
  issuedAt: string;
  oauthClientId: string;
}

// ----------------------------------------------------------------------------
// RegisterUser
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

export class WindsurfRegistrationError extends Error {
  readonly status: number;
  readonly connectCode?: string;
  readonly traceId?: string;
  constructor(message: string, status: number, connectCode?: string, traceId?: string) {
    super(message);
    this.name = "WindsurfRegistrationError";
    this.status = status;
    this.connectCode = connectCode;
    this.traceId = traceId;
  }
}

const TRACE_ID_RE = /\(trace ID: ([0-9a-f]+)\)/i;

export async function registerUser(
  firebaseIdToken: string,
  region: WindsurfRegion,
  abortSignal?: AbortSignal,
): Promise<OAuthLoginResult> {
  const url = `${region.registerApiServerUrl.replace(/\/$/, "")}/exa.seat_management_pb.SeatManagementService/RegisterUser`;
  const timeoutSignal = AbortSignal.timeout(30_000);
  const combinedSignal = abortSignal ? anySignal([abortSignal, timeoutSignal]) : timeoutSignal;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Connect-Protocol-Version": "1" },
    body: JSON.stringify({ firebase_id_token: firebaseIdToken }),
    signal: combinedSignal,
  });
  const text = await response.text();

  if (!response.ok) {
    let connectCode: string | undefined;
    let message = text || `RegisterUser failed with HTTP ${response.status}`;
    try {
      const errJson = JSON.parse(text) as { code?: string; message?: string };
      connectCode = errJson.code;
      if (errJson.message) message = errJson.message;
    } catch {}
    const traceMatch = message.match(TRACE_ID_RE);
    throw new WindsurfRegistrationError(message, response.status, connectCode, traceMatch?.[1]);
  }

  const parsed = JSON.parse(text) as { api_key?: string; name?: string; api_server_url?: string; redirect_url?: string };
  const apiKey = parsed.api_key;
  const name = parsed.name;
  const apiServerUrl = parsed.api_server_url && parsed.api_server_url.length > 0 ? parsed.api_server_url : "https://server.codeium.com";

  if (!apiKey) throw new WindsurfRegistrationError("RegisterUser returned 200 but api_key was empty", response.status, "malformed_response");
  if (!name) throw new WindsurfRegistrationError("RegisterUser returned 200 but name was empty", response.status, "malformed_response");

  return { apiKey, name, apiServerUrl, redirectUrl: parsed.redirect_url };
}

// ----------------------------------------------------------------------------
// Credential Storage
// ----------------------------------------------------------------------------

const APP_DIR_NAME = "opencode-windsurf-auth";
const CREDS_FILENAME = "credentials.json";

export function getCredentialsDir(): string {
  return path.join(os.homedir(), ".config", APP_DIR_NAME);
}

export function getCredentialsPath(): string {
  return path.join(getCredentialsDir(), CREDS_FILENAME);
}

function ensureDir(): void {
  const dir = getCredentialsDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
}

export function loadCredentials(): PersistedCredentials | null {
  const p = getCredentialsPath();
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, "utf8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (typeof parsed.apiKey !== "string" || !parsed.apiKey ||
      typeof parsed.name !== "string" || !parsed.name ||
      typeof parsed.apiServerUrl !== "string" || !parsed.apiServerUrl) {
    throw new Error(`Credentials file at ${p} is missing required fields.`);
  }
  return parsed as unknown as PersistedCredentials;
}

export function saveCredentials(creds: PersistedCredentials): void {
  ensureDir();
  const p = getCredentialsPath();
  fs.writeFileSync(p, JSON.stringify(creds, null, 2), { mode: 0o600 });
}

export function deleteCredentials(): boolean {
  const p = getCredentialsPath();
  if (!fs.existsSync(p)) return false;
  fs.unlinkSync(p);
  return true;
}

// ----------------------------------------------------------------------------
// Login flow — loopback callback
// ----------------------------------------------------------------------------

interface CallbackResult { token: string; state: string; }

export async function runLoginLoopback(
  region: WindsurfRegion,
  onUrl: (url: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const state = crypto.randomUUID();
  const server = await startCallbackServer();
  const callbackUrl = `http://127.0.0.1:${server.port}/auth`;
  const loginUrl = buildLoginUrl(region, callbackUrl, "query", state);

  const callbackPromise = server.callback(state);
  callbackPromise.catch(() => {});

  onUrl(loginUrl);
  await openBrowser(loginUrl).catch(() => {});

  const callback = await waitWithTimeout(callbackPromise, 5 * 60 * 1000, signal, "Sign-in timed out.");

  if (!callback.token) throw new Error("OAuth callback delivered an empty token.");
  server.close();
  return callback.token;
}

function buildLoginUrl(region: WindsurfRegion, redirectUri: string, redirectParametersType: "query" | "fragment", state: string): string {
  const params = new URLSearchParams([
    ["response_type", "token"],
    ["client_id", region.oauthClientId],
    ["redirect_uri", redirectUri],
    ["state", state],
    ["prompt", "login"],
    ["redirect_parameters_type", redirectParametersType],
  ]);
  return `${region.website.replace(/\/$/, "")}/windsurf/signin?${params.toString()}`;
}

interface CallbackServer {
  port: number;
  close: () => void;
  callback: (expectedState: string) => Promise<CallbackResult>;
}

function startCallbackServer(): Promise<CallbackServer> {
  return new Promise((resolve, reject) => {
    let captured: { token: string; state: string } | null = null;
    const waiters: Array<{ state: string; resolve: (r: CallbackResult) => void; reject: (e: Error) => void }> = [];

    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (url.pathname !== "/auth") { res.writeHead(404); res.end("Not Found"); return; }

      const tokenParam = url.searchParams.get("firebase_id_token") ?? url.searchParams.get("access_token") ?? url.searchParams.get("token");
      const stateParam = url.searchParams.get("state") ?? "";

      if (!tokenParam) {
        const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><script>(function(){var h=window.location.hash.replace(/^#/,'');if(!h){document.body.innerText='No token in URL.';return}window.location.replace('/auth?'+h);})();</script></body></html>`;
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }

      const matchedWaiter = waiters.find(w => w.state === stateParam);
      if (!matchedWaiter) {
        renderResponse(res, false, "Unexpected callback — does not match any active sign-in attempt. Close this tab.");
        return;
      }
      captured = { token: tokenParam, state: stateParam };
      renderResponse(res, true, "Sign-in complete — you can close this tab.");
      for (let i = waiters.length - 1; i >= 0; i--) {
        const w = waiters[i];
        if (w.state === captured.state) { w.resolve(captured); waiters.splice(i, 1); }
      }
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") { reject(new Error("Failed to bind")); return; }
      resolve({
        port: addr.port,
        close: () => server.close(),
        callback: (expectedState: string) => new Promise((res, rej) => {
          if (captured) res({ token: captured.token, state: captured.state });
          else waiters.push({ state: expectedState, resolve: res, reject: rej });
        }),
      });
    });
  });
}

function renderResponse(res: http.ServerResponse, ok: boolean, message: string): void {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>windsurf-openai</title><style>body{font:14px -apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0b0d12;color:#e7e9ee}.card{max-width:520px;padding:28px 32px;border-radius:14px;background:#151823;border:1px solid #232838;text-align:center}h1{font-size:18px;margin:0 0 10px;color:${ok ? "#71d784" : "#ff8585"}}p{margin:6px 0;color:#9aa3b2}</style></head><body><div class="card"><h1>${ok ? "Signed in" : "Sign-in failed"}</h1><p>${escapeHtml(message)}</p></div></body></html>`;
  res.writeHead(ok ? 200 : 400, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end(html);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

async function openBrowser(url: string): Promise<void> {
  const cmds = process.platform === "darwin" ? [{ cmd: "open", args: [url] }]
    : process.platform === "win32" ? [{ cmd: "cmd", args: ["/c", "start", '""', url] }]
    : [{ cmd: "xdg-open", args: [url] }, { cmd: "sensible-browser", args: [url] }];

  for (const c of cmds) {
    const ok = await new Promise<boolean>(resolve => {
      const child = spawn(c.cmd, c.args, { stdio: "ignore", detached: true });
      child.on("error", () => resolve(false));
      child.on("spawn", () => { child.unref(); resolve(true); });
    });
    if (ok) return;
  }
  throw new Error(`Unable to open browser. Open this URL manually:\n  ${url}`);
}

function waitWithTimeout<T>(p: Promise<T>, timeoutMs: number, signal: AbortSignal | undefined, msg: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const onAbort = () => { cleanup(); reject(new Error("Sign-in cancelled.")); };
    const timer = setTimeout(() => { cleanup(); reject(new Error(msg)); }, timeoutMs);
    const cleanup = () => { clearTimeout(timer); if (signal) signal.removeEventListener("abort", onAbort); };
    if (signal) {
      if (signal.aborted) { onAbort(); return; }
      signal.addEventListener("abort", onAbort, { once: true });
    }
    p.then(v => { cleanup(); resolve(v); }, e => { cleanup(); reject(e); });
  });
}
