/**
 * windsurf-openai — standalone OpenAI-compatible proxy for Windsurf/Cognition.
 *
 * Usage:
 *   npx tsx cli.ts serve [--port 42100] [--host 127.0.0.1]
 *   npx tsx cli.ts login
 *   npx tsx cli.ts status
 *   npx tsx cli.ts logout
 *   npx tsx cli.ts models
 *
 * The proxy speaks OpenAI Chat Completions at http://<host>:<port>/v1.
 * Localhost clients need no key; remote clients (--host 0.0.0.0) send
 * Bearer <apiKey> (printed by `status`).
 *
 * Point Zed's llama.cpp provider at http://127.0.0.1:42100 (no /v1),
 * or any OpenAI-compatible client at http://127.0.0.1:42100/v1.
 */
import { startProxy, stopProxy, buildModelList } from "./proxy";
import {
  loadCredentials, saveCredentials, deleteCredentials,
  DEFAULT_REGION, runLoginLoopback, registerUser,
  type PersistedCredentials,
} from "./oauth";
import { clearCachedUserJwt } from "./auth";
import { clearSessionIds, streamChatEvents } from "./chat";
import { getUserStatus, isPromoActive, clearCachedUserStatus } from "./status";
import { clearCachedCatalog } from "./catalog";

const DEFAULT_PORT = 42100;
const DEFAULT_HOST = "127.0.0.1";

function parseArgs(argv: string[]): { command: string; port: number; host: string; zed: boolean } {
  let command = "serve";
  let port = DEFAULT_PORT;
  let host = DEFAULT_HOST;
  let zed = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--port" || a === "-p") { port = parseInt(argv[++i] ?? "", 10) || DEFAULT_PORT; }
    else if (a === "--host" || a === "--bind") { host = argv[++i] ?? DEFAULT_HOST; }
    else if (a === "--zed") { zed = true; }
    else if (!a.startsWith("--")) { command = a; }
  }
  return { command, port, host, zed };
}

async function cmdServe(port: number, host: string): Promise<void> {
  const stored = loadCredentials();
  if (stored) {
    console.error(`[windsurf] authenticated as ${stored.name} (${stored.apiServerUrl})`);
    // Warm the live model list (GetUserStatus) so /v1/models reflects the account.
    getUserStatus(stored.apiKey, stored.apiServerUrl).then((s) => {
      console.error(`[windsurf] plan: ${s.planName ?? "?"}, ${s.models.size} models from Windsurf`);
    }).catch(() => {});
  } else {
    console.error("[windsurf] not authenticated — run: windsurf-openai login");
  }

  const actualPort = await startProxy(port, host);
  console.error(`[windsurf] proxy listening on http://${host}:${actualPort}/v1`);
  console.error(`[windsurf] models endpoint:  http://${host}:${actualPort}/v1/models`);
  console.error(`[windsurf] chat endpoint:   http://${host}:${actualPort}/v1/chat/completions`);
  if (stored) {
    console.error(`[windsurf] api_key (Bearer, remote clients): ${stored.apiKey}`);
  } else {
    console.error("[windsurf] chat will return 503 until you log in (windsurf-openai login)");
  }
  console.error("[windsurf] press Ctrl+C to stop");

  const shutdown = (): void => {
    console.error("\n[windsurf] shutting down…");
    stopProxy();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function cmdLogin(): Promise<void> {
  console.error("[windsurf] opening browser to sign in…");
  let token: string = "";
  try {
    token = await runLoginLoopback(DEFAULT_REGION, (url) => {
      console.error(`[windsurf] if a browser didn't open, visit:\n  ${url}`);
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[windsurf] login failed: ${msg}`);
    process.exit(1);
  }

  const result = await registerUser(token, DEFAULT_REGION);
  const creds: PersistedCredentials = {
    ...result,
    issuedAt: new Date().toISOString(),
    oauthClientId: DEFAULT_REGION.oauthClientId,
  };
  saveCredentials(creds);
  clearCachedUserJwt();
  clearSessionIds();
  clearCachedCatalog();
  clearCachedUserStatus();
  console.error(`[windsurf] signed in as ${result.name}`);
  console.error(`[windsurf] api_key: ${result.apiKey}`);
  console.error(`[windsurf] server:  ${result.apiServerUrl}`);
  console.error("[windsurf] now run: windsurf-openai serve");
}

function cmdStatus(): void {
  const c = loadCredentials();
  if (!c) {
    console.error("[windsurf] not signed in. Run: windsurf-openai login");
    return;
  }
  console.log(`name:         ${c.name}`);
  console.log(`apiServerUrl: ${c.apiServerUrl}`);
  console.log(`apiKey:       ${c.apiKey}`);
  console.log(`issuedAt:     ${c.issuedAt}`);
}

function cmdLogout(): void {
  const ok = deleteCredentials();
  clearCachedUserJwt();
  clearSessionIds();
  clearCachedCatalog();
  clearCachedUserStatus();
  console.error(ok ? "[windsurf] signed out." : "[windsurf] already signed out.");
}

async function cmdModels(zed: boolean): Promise<void> {
  const items = await buildModelList();

  if (zed) {
    // Ready-to-paste JSON for Zed's openai_compatible available_models.
    // `name` is what gets sent as the request model — the pretty id (with tier),
    // which the proxy resolves back to the canonical id.
    const arr = items.map(m => ({
      name: m.id,
      display_name: m.name,
      max_tokens: m.contextWindow ?? 128000,
    }));
    console.log(JSON.stringify(arr, null, 2));
    return;
  }

  console.log("model (id sent to clients)                      canonical");
  console.log("------                                        ----");
  for (const m of items) {
    console.log(`${m.id.padEnd(46)} ${m.canonical}`);
  }
  console.log("");
  console.log(`total: ${items.length} models`);
  console.log("Cost marks:");
  console.log("  ($$)       tier — Windsurf's credits-per-prompt when online, else");
  console.log("             reference prices / family / tiers.json");
  console.log("  (free)     active promo window (plugin's PROMO) or 0 credits per prompt");
  console.log("  (unknown)  no pricing data");
  console.log("Tiers from credits: 0 → free, <10 → $, <100 → $$, ≥100 → $$$. `probe`");
  console.log("shows the raw per-model credits + extra-usage API prices.");
  console.log("Use --zed to print Zed-ready available_models JSON.");
}

function fmtPrice(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
}

async function cmdProbe(): Promise<void> {
  const c = loadCredentials();
  if (!c) {
    console.error("[windsurf] not signed in. Run: windsurf-openai login");
    return;
  }
  const host = c.apiServerUrl.replace(/\/$/, "");

  // 1. GetUserStatus — the endpoint the plugin uses: full model list + credits + pricing
  console.log("\n=== 1. GetUserStatus — models with Windsurf's own credits & prices ===");
  try {
    const status = await getUserStatus(c.apiKey, host);
    console.log(`  plan: ${status.planName ?? "?"}  models: ${status.models.size}`);
    let n = 0;
    for (const m of status.models.values()) {
      if (m.disabled || n >= 15) continue;
      n++;
      const promo = isPromoActive(m) ? ` PROMO→${new Date(m.promoUntil! * 1000).toISOString().slice(0, 10)}` : "";
      const cr = m.creditsPerPrompt !== undefined ? `${fmtPrice(m.creditsPerPrompt)}cr` : "?";
      const p = m.pricing ? `$${fmtPrice(m.pricing.input ?? 0)}/$${fmtPrice(m.pricing.output ?? 0)} per 1M` : "";
      console.log(`  ${m.label.padEnd(34)} ${cr.padEnd(7)} ${p}${promo}`);
    }
    const promos = [...status.models.values()].filter(m => isPromoActive(m));
    console.log(`  active promos: ${promos.length} → ${promos.map(m => m.label).join(", ")}`);
  } catch (e) { console.log("  ERR:", e instanceof Error ? e.message : String(e)); }

  // 2. One tiny chat request with usage debug — dump every metric the server sends
  console.log("\n=== 2. Chat request — all usage metrics ===");
  process.env.WINDSURF_DEBUG_USAGE = "1";
  try {
    const probeUid = [...(await getUserStatus(c.apiKey, host)).models.values()]
      .find(m => !m.disabled)?.uid ?? "swe-2-high";
    let text = "";
    for await (const ev of streamChatEvents({
      apiKey: c.apiKey,
      apiServerUrl: c.apiServerUrl,
      modelUid: probeUid,
      messages: [{ role: "user", content: "hi" }],
      completionOpts: { maxOutputTokens: 16 },
    })) {
      if (ev.kind === "text") text += ev.text;
      if (ev.kind === "usage") console.log("  parsed usage:", JSON.stringify(ev));
    }
    console.log("  reply:", text.slice(0, 80) || "(empty)");
  } catch (e) { console.log("  ERR:", e instanceof Error ? e.message : String(e)); }
}

async function main(): Promise<void> {
  const { command, port, host, zed } = parseArgs(process.argv.slice(2));
  switch (command) {
    case "serve": await cmdServe(port, host); break;
    case "login": await cmdLogin(); break;
    case "status": cmdStatus(); break;
    case "logout": cmdLogout(); break;
    case "models": await cmdModels(zed); break;
    case "probe": await cmdProbe(); break;
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp(): void {
  console.log(`windsurf-openai — standalone OpenAI-compatible proxy for Windsurf/Cognition

Usage:
  npx tsx cli.ts serve [--port 42100] [--host 127.0.0.1]
  npx tsx cli.ts login
  npx tsx cli.ts status
  npx tsx cli.ts logout
  npx tsx cli.ts models
  npx tsx cli.ts probe

Commands:
  serve   Start the HTTP proxy (default). Point OpenAI clients at http://<host>:<port>/v1
  login   Sign in via Windsurf OAuth and save credentials to disk
  status  Show saved credentials
  logout  Delete saved credentials
  models  Print the known model list with approximate pricing
  probe   Dump Windsurf's raw per-model credits + prices from GetUserStatus,
          then log every usage metric from one tiny chat request

Options:
  --port, -p <n>   Proxy port (default 42100)
  --host <addr>    Bind address (default 127.0.0.1; use 0.0.0.0 to expose on LAN)
`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
