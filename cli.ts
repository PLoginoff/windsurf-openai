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
import { getUserStatus, isPromoActive, isActuallyFreePromo, clearCachedUserStatus } from "./status";
import { isBlockedModel } from "./costs";
import { powerScore, getOrCatalog, lookupOrInfo } from "./ranks";
import { clearCachedCatalog } from "./catalog";

const DEFAULT_PORT = 42100;
const DEFAULT_HOST = "127.0.0.1";

function parseArgs(argv: string[]): { command: string; port: number; host: string; zed: boolean; all: boolean } {
  let command = "serve";
  let port = DEFAULT_PORT;
  let host = DEFAULT_HOST;
  let zed = false;
  let all = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--port" || a === "-p") { port = parseInt(argv[++i] ?? "", 10) || DEFAULT_PORT; }
    else if (a === "--host" || a === "--bind") { host = argv[++i] ?? DEFAULT_HOST; }
    else if (a === "--zed") { zed = true; }
    else if (a === "--all") { all = true; }
    else if (!a.startsWith("--")) { command = a; }
  }
  return { command, port, host, zed, all };
}

async function cmdServe(port: number, host: string): Promise<void> {
  const stored = loadCredentials();
  if (stored) {
    console.error(`[windsurf] authenticated as ${stored.name} (${stored.apiServerUrl})`);
    // Warm the live model list (GetUserStatus) so /v1/models reflects the account.
    getUserStatus(stored.apiKey, stored.apiServerUrl).then((s) => {
      const available = [...s.models.values()].filter(m => !m.disabled && !isBlockedModel(m.uid)).length;
      console.log(`[windsurf] plan: ${s.planName ?? "?"}, ${available} models available (${s.models.size} from Windsurf, ${s.models.size - available} hidden)`);
    }).catch(() => {});
    // Warm OpenRouter benchmarks in the background — used by `recommend`.
    getOrCatalog().then((or) => {
      if (or) console.log(`[windsurf] OpenRouter rankings loaded: ${or.byId.size} models`);
      else console.log("[windsurf] OpenRouter unreachable — `recommend` will show no scores");
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
  console.log("  $$        tier — Windsurf's credits-per-prompt when online, else");
  console.log("            reference prices / family / tiers.json");
  console.log("  free      Windsurf-marketed free promo (SWE) or 0 credits per prompt");
  console.log("  promo     discounted window — very cheap, but still per-prompt credits");
  console.log("  unknown   no pricing data");
  console.log("Tiers from credits: 0 → free, <10 → $, <100 → $$, ≥100 → $$$. `probe`");
  console.log("shows the raw per-model credits + extra-usage API prices.");
  console.log("Use --zed to print Zed-ready available_models JSON.");
}

function fmtPrice(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
}

async function cmdRecommend(all: boolean): Promise<void> {
  const c = loadCredentials();
  if (!c) {
    console.error("[windsurf] not signed in. Run: windsurf-openai login");
    return;
  }
  const status = await getUserStatus(c.apiKey, c.apiServerUrl);

  const rows: Array<{
    uid: string; label: string; score?: number; credits?: number; free: boolean; promo: boolean;
    wsIn?: number; wsOut?: number; orIn?: number; orOut?: number;
  }> = [];
  for (const m of status.models.values()) {
    if (m.disabled || isBlockedModel(m.uid)) continue;
    const score = await powerScore(m.uid);
    rows.push({
      uid: m.uid, label: m.label, score,
      credits: m.creditsPerPrompt,
      free: isActuallyFreePromo(m),
      promo: isPromoActive(m) && !isActuallyFreePromo(m),
      wsIn: m.pricing?.input, wsOut: m.pricing?.output,
    });
  }

  // Enrich with OR prices for models we can map.
  await Promise.all(rows.map(async (r) => {
    const info = await lookupOrInfo(r.uid);
    if (info) { r.orIn = info.inputPer1M; r.orOut = info.outputPer1M; }
  }));

  const fmt = (n: number | undefined, digits = 2): string =>
    n === undefined ? "-" : n.toFixed(digits).replace(/\.?0+$/, "");

  const line = (r: typeof rows[number]): string => {
    const score = r.score !== undefined ? String(Math.round(r.score)).padStart(3) : "  ?";
    const credits = r.credits !== undefined ? fmt(r.credits, 1).padStart(5) : "    ?";
    const ws = r.wsIn !== undefined ? `${fmt(r.wsIn)}/${fmt(r.wsOut)}` : "-";
    const orr = r.orIn !== undefined ? `${fmt(r.orIn)}/${fmt(r.orOut)}` : "-";
    return `${score}  ${credits}cr  ${ws.padEnd(16)}  ${orr.padEnd(16)}  ${r.label}`;
  };

  if (all) {
    // Full flat table: free first, then promos, score desc, price asc.
    rows.sort((a, b) => {
      if (a.free !== b.free) return a.free ? -1 : 1;
      if (a.promo !== b.promo) return a.promo ? -1 : 1;
      const sa = a.score ?? -1, sb = b.score ?? -1;
      if (sa !== sb) return sb - sa;
      return (a.credits ?? 1e9) - (b.credits ?? 1e9);
    });
    console.log(`plan: ${status.planName ?? "?"}   models: ${rows.length} available\n`);
    console.log("TIER    SCORE  CREDITS  WS $/1M (in/out)   OR $/1M (in/out)   MODEL");
    console.log("-----   -----  -------  ----------------   ----------------   -----");
    for (const r of rows) {
      const tier = (r.free ? "FREE" : r.promo ? "PROMO" : "").padEnd(5);
      console.log(`${tier}  ${line(r)}`);
    }
    console.log("\nSCORE — Artificial Analysis coding/intelligence index via OpenRouter (0-100).");
    console.log("FREE — 0-credit promo as marketed by Windsurf (SWE). PROMO — discounted window, still per-prompt credits.");
    console.log("WS $/1M — Windsurf extra-usage prices; OR $/1M — OpenRouter reference. SWE scores are estimates.");
    return;
  }

  // ---- Digest: buckets, few picks each ----
  const byScore = (a: typeof rows[number], b: typeof rows[number]) =>
    (b.score ?? -1) - (a.score ?? -1) || (a.credits ?? 1e9) - (b.credits ?? 1e9);

  const free = rows.filter(r => r.free).sort(byScore);                  // genuinely 0 credits (SWE line)
  const promo = rows.filter(r => r.promo).sort(byScore);                // promo pricing: dirt cheap, but non-zero
  const rest = rows.filter(r => !r.free && !r.promo);
  const value = rest.filter(r => (r.credits ?? 1e9) <= 10).sort(byScore);   // best bang for buck (≤10cr)
  const power = rest.filter(r => (r.credits ?? 1e9) > 10 && (r.credits ?? 1e9) <= 60).sort(byScore);
  const premium = rest.filter(r => (r.credits ?? 1e9) > 60).sort(byScore);

  const promoTill = promo.length
    ? new Date(Math.max(...status.models.values().filter(isPromoActive).map(m => (m.promoUntil ?? 0) * 1000)))
        .toISOString().slice(0, 10)
    : "";

  const section = (title: string, picks: typeof rows, note: string): void => {
    console.log(`── ${title} ${note ? "— " + note : ""}`);
    if (!picks.length) { console.log("   (none)"); console.log(""); return; }
    for (const r of picks.slice(0, 5)) console.log("   " + line(r));
    if (picks.length > 5) console.log(`   … +${picks.length - 5} more (--all)`);
    console.log("");
  };

  console.log(`plan: ${status.planName ?? "?"}   models: ${rows.length} available\n`);
  section("FREE (0 credits)", free, "genuinely free — grab it while the promo window is open");
  section("PROMO (dirt cheap)", promo, "heavy discount, but non-zero credits — active until " + promoTill);
  section("VALUE (≤10 credits)", value, "best bang for the buck");
  section("POWER (10-60 credits)", power, "serious muscle at a fair price");
  section("PREMIUM (60+ credits)", premium, "pricey — save for the really hard stuff");

  const best = [...value].sort(byScore)[0];
  const strongest = [...power].sort(byScore)[0];
  if (best) console.log(`Best value pick: go with "${best.label}" (${best.credits}cr, score ${Math.round(best.score ?? 0)}).`);
  if (strongest) console.log(`Most power for the price: "${strongest.label}" (${strongest.credits}cr, score ${Math.round(strongest.score ?? 0)}).`);
  console.log("\nSCORE — Artificial Analysis index via OpenRouter. CREDITS — Windsurf per prompt.");
  console.log("WS $/1M — Windsurf extra-usage; OR $/1M — reference market price. Full list: recommend --all");
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
  const { command, port, host, zed, all } = parseArgs(process.argv.slice(2));
  switch (command) {
    case "serve": await cmdServe(port, host); break;
    case "login": await cmdLogin(); break;
    case "status": cmdStatus(); break;
    case "logout": cmdLogout(); break;
    case "models": await cmdModels(zed); break;
    case "recommend": await cmdRecommend(all); break;
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
  npx tsx cli.ts recommend
  npx tsx cli.ts probe

Commands:
  serve   Start the HTTP proxy (default). Point OpenAI clients at http://<host>:<port>/v1
  login   Sign in via Windsurf OAuth and save credentials to disk
  status  Show saved credentials
  logout  Delete saved credentials
  models  Print the known model list with approximate pricing
  recommend  Power-vs-cost table: merges Windsurf promos/credits with
          OpenRouter benchmarks ( Artificial Analysis ) — shows what to use now
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
