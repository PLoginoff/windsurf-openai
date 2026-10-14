# Windsurf model recommendations

> Practical advice for a Windsurf Pro subscription (October 2026), followed by the full model table.
> Regenerate the table with `npx tsx cli.ts recommend --all --md`; refresh TPS with `npx tsx cli.ts speeds`.

## What to actually use

**TL;DR:** SWE-2 for free work, GLM-5.3 Max / Kimi K3 for subscription credits, Gemini 3.8 Flash when the promo is on, and only buy frontier models (Claude/GPT) in Extra-Usage — at market price.

1. **Free Workhorse (`SWE-2 High ★50 free`):**
   - Costs **0 credits** while the promo window lasts.
   - Best for routine edits, refactoring, exploring directories, running tools, and small bugs. Don't burn your paid plan credits on simple tasks.
2. **Best on Subscription Credits (`GLM-5.3 Max ★75 $` & `Kimi K3 High ★76 $`):**
   - **GLM-5.3 Max** costs just **1 credit per prompt** while delivering top-tier benchmark intelligence (★75). It is by far the highest value-per-credit model on the platform.
   - **Kimi K3** is a fantastic alternative for 4–6 credits when you need a different perspective.
   - Save **Claude Opus 5.5 (45cr)** or **Claude Fable 5.1 (50–175cr)** for the hardest architectural challenges.
3. **Extra Usage Beyond Plan Credits (Paying in Real $):**
   - **Safe to buy in Windsurf:** Western frontier models (**Claude Opus/Sonnet 5.5**, **GPT-5.4**, **Gemini 3.8 Flash**) have zero markup in Windsurf Extra-Usage — prices match OpenRouter and official APIs 1:1 (e.g. Claude Opus 5.5 is $4/$20 per 1M tokens either way).
   - **Do NOT buy via Windsurf Extra-Usage:** Chinese open models like **GLM-5.3**, **GLM-5.2**, or **Kimi K3**. Windsurf charges up to a **20x markup on input tokens** ($1.40/1M vs $0.08/1M on OpenRouter). If your subscription credits run out, switch to OpenRouter directly for these models!
   - **Exception:** **GLM-5.3 Flash** — its Windsurf price ($0.15/$0.5) is actually fine after the subscription, roughly matching OpenRouter ($0.04/$0.9). A cheap, fast fallback when you're out of credits.
   - **Exception:** **Gemini 3.7/3.8 Flash** — zero markup ($0.75/$3.75, same as OpenRouter) and ★76 intelligence. The best value model to buy in Extra-Usage when the promo window is over.

Run `npx tsx cli.ts recommend` anytime to get the live picture for your account.

## All models

> Snapshot for plan **Pro**, 201 models, generated 2026-10-14.
> Regenerate: `npx tsx cli.ts recommend --all --md`.

| Tier | Score | Credits | WS $/1M in/out | OR $/1M in/out | Age | TPS | Model |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 🟢 FREE | 50 | 0 | - | - | fresh | 100 | SWE-2 Medium |
| 🟢 FREE | 50 | 0 | - | - | fresh | 100 | SWE-2 High |
| 🟢 FREE | 50 | 0 | - | - | fresh | 100 | SWE-2 Max |
| 🟢 PROMO | 76 | 6 | 0.75/3.75 | 0.75/3.75 | fresh | 77 | Gemini 3.7 Flash Low |
| 🟢 PROMO | 76 | 6 | 0.75/3.75 | 0.75/3.75 | fresh | 77 | Gemini 3.8 Flash Low |
| 🟢 PROMO | 76 | 8 | 0.75/3.75 | 0.75/3.75 | fresh | 77 | Gemini 3.8 Flash Medium |
| 🟢 PROMO | 76 | 8 | 0.75/3.75 | 0.75/3.75 | fresh | 77 | Gemini 3.7 Flash Medium |
| 🟢 PROMO | 76 | 10 | 0.75/3.75 | 0.75/3.75 | fresh | 77 | Gemini 3.7 Flash High |
| 🟢 PROMO | 76 | 10 | 0.75/3.75 | 0.75/3.75 | fresh | 77 | Gemini 3.8 Flash High |
| 🟢 PROMO | ? | 50 | 1/5 | - | - | - | Gemini 4 Argon Low |
| 🟢 PROMO | ? | 70 | 1/5 | - | - | - | Gemini 4 Argon Medium |
| 🟢 PROMO | ? | 90 | 1/5 | - | - | - | Gemini 4 Argon High |
| 🟡 | 82 | 40 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5 Low |
| 🟡 | 82 | 50 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5 Medium |
| 🟡 | 82 | 70 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5 High |
| 🟡 | 82 | 80 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5 XHigh |
| 🔴 | 82 | 100 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5 Max |
| 🔴 | 82 | 150 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5.1 Low |
| 🔴 | 82 | 175 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5.1 Medium |
| 🔴 | 82 | 200 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5.1 High |
| 🔴 | 82 | 225 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5.1 XHigh |
| 🔴 | 82 | 250 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5.1 Max |
| 🟡 | 78 | 75 | 5/25 | 5/25 | fresh | 70 | Claude Opus 5 Low |
| 🟡 | 78 | 80 | 5/25 | 5/25 | fresh | 70 | Claude Opus 5 Medium |
| 🔴 | 78 | 115 | 5/25 | 5/25 | fresh | 70 | Claude Opus 5 High |
| 🔴 | 78 | 150 | 10/50 | 5/25 | fresh | 70 | Claude Opus 5 Low Fast |
| 🔴 | 78 | 155 | 5/25 | 5/25 | fresh | 70 | Claude Opus 5 XHigh |
| 🔴 | 78 | 160 | 5/25 | 5/25 | fresh | 70 | Claude Opus 5 Max |
| 🔴 | 78 | 160 | 10/50 | 5/25 | fresh | 70 | Claude Opus 5 Medium Fast |
| 🔴 | 78 | 230 | 10/50 | 5/25 | fresh | 70 | Claude Opus 5 High Fast |
| 🔴 | 78 | 310 | 10/50 | 5/25 | fresh | 70 | Claude Opus 5 XHigh Fast |
| 🔴 | 78 | 320 | 10/50 | 5/25 | fresh | 70 | Claude Opus 5 Max Fast |
| 🟡 | 77 | 10 | 2/6 | 2/6 | fresh | 55 | Grok 4.6 Low |
| 🟡 | 77 | 20 | 2/6 | 2/6 | fresh | 55 | Grok 4.6 Medium |
| 🟡 | 77 | 25 | 2/6 | 2/6 | fresh | 55 | Grok 4.6 High |
| 🟡 | 77 | 30 | 2/6 | 2/6 | fresh | 55 | Grok 4.6 XHigh |
| 🟢 | 76 | 4 | 3/15 | 0.7/15 | fresh | 49 | Kimi K3 Low |
| 🟢 | 76 | 6 | 3/15 | 0.7/15 | fresh | 49 | Kimi K3 High |
| 🟢 | 76 | 9 | 3/15 | 0.7/15 | fresh | 49 | Kimi K3 Max |
| 🟡 | 75 | 9 | 5/30 | 5/30 | fresh | 57 | GPT-5.5 No Thinking |
| 🟡 | 75 | 12 | 5/30 | 5/30 | fresh | 57 | GPT-5.5 Low Thinking |
| 🟡 | 75 | 15 | 5/30 | 5/30 | fresh | 57 | GPT-5.5 Medium Thinking |
| 🟡 | 75 | 22.5 | 12.5/75 | 5/30 | fresh | 57 | GPT-5.5 No Thinking Fast |
| 🟡 | 75 | 24 | 5/30 | 5/30 | fresh | 57 | GPT-5.5 High Thinking |
| 🟡 | 75 | 30 | 12.5/75 | 5/30 | fresh | 57 | GPT-5.5 Low Thinking Fast |
| 🟡 | 75 | 36 | 5/30 | 5/30 | fresh | 57 | GPT-5.5 XHigh Thinking |
| 🟡 | 75 | 37.5 | 12.5/75 | 5/30 | fresh | 57 | GPT-5.5 Medium Thinking Fast |
| 🟡 | 75 | 60 | 12.5/75 | 5/30 | fresh | 57 | GPT-5.5 High Thinking Fast |
| 🟡 | 75 | 90 | 12.5/75 | 5/30 | fresh | 57 | GPT-5.5 XHigh Thinking Fast |
| 🟢 | 75 | 1 | 1.4/4.4 | 0.08/4.8 | fresh | 85 | GLM-5.3 Low |
| 🟢 | 75 | 1 | 1.4/4.4 | 0.08/4.8 | fresh | 85 | GLM-5.3 High |
| 🟢 | 75 | 1 | 1.4/4.4 | 0.08/4.8 | fresh | 85 | GLM-5.3 Max |
| 🟡 | 74 | 20 | 5/25 | 5/25 | fresh | 76 | Claude Opus 4.8 Low |
| 🟡 | 74 | 25 | 5/25 | 5/25 | fresh | 76 | Claude Opus 4.8 Medium |
| 🟡 | 74 | 35 | 5/25 | 5/25 | fresh | 76 | Claude Opus 4.8 High |
| 🟡 | 74 | 40 | 5/25 | 5/25 | fresh | 76 | Claude Opus 4.8 XHigh |
| 🟡 | 74 | 40 | 10/50 | 5/25 | fresh | 76 | Claude Opus 4.8 Low Fast |
| 🟡 | 74 | 50 | 5/25 | 5/25 | fresh | 76 | Claude Opus 4.8 Max |
| 🟡 | 74 | 50 | 10/50 | 5/25 | fresh | 76 | Claude Opus 4.8 Medium Fast |
| 🟡 | 74 | 70 | 10/50 | 5/25 | fresh | 76 | Claude Opus 4.8 High Fast |
| 🟡 | 74 | 80 | 10/50 | 5/25 | fresh | 76 | Claude Opus 4.8 XHigh Fast |
| 🔴 | 74 | 100 | 10/50 | 5/25 | fresh | 76 | Claude Opus 4.8 Max Fast |
| 🟡 | 74 | 20 | 5/25 | 5/25 | fresh | 56 | Claude Opus 4.7 Low |
| 🟡 | 74 | 40 | 5/25 | 5/25 | fresh | 56 | Claude Opus 4.7 Medium |
| 🟡 | 74 | 60 | 5/25 | 5/25 | fresh | 56 | Claude Opus 4.7 High |
| 🟡 | 74 | 65 | 5/25 | 5/25 | fresh | 56 | Claude Opus 4.7 XHigh |
| 🟡 | 74 | 75 | 5/25 | 5/25 | fresh | 56 | Claude Opus 4.7 Max |
| 🟡 | 72 | 0.1 | 0.3/0.5 | 2/6 | fresh | 54 | xAI Grok-3 mini Thinking |
| 🟡 | 72 | 1 | 3/15 | 2/6 | fresh | 54 | xAI Grok-3 |
| 🟡 | 72 | 5 | 2/6 | 2/6 | fresh | 54 | Grok 4.5 Low |
| 🟡 | 72 | 8 | 2/6 | 2/6 | fresh | 54 | Grok 4.5 Medium |
| 🟡 | 72 | 10 | 2/6 | 2/6 | fresh | 54 | Grok 4.5 High |
| 🟢 | 72 | 1 | 0.15/0.5 | 0.04/0.9 | fresh | 67 | GLM-5.3 Flash Low |
| 🟢 | 72 | 1 | 0.15/0.5 | 0.04/0.9 | fresh | 67 | GLM-5.3 Flash High |
| 🟢 | 72 | 1 | 0.15/0.5 | 0.04/0.9 | fresh | 67 | GLM-5.3 Flash Max |
| 🟡 | 72 | 12 | 2/10 | 2/10 | fresh | 71 | Claude Sonnet 5 Low |
| 🟡 | 72 | 15 | 2/10 | 2/10 | fresh | 71 | Claude Sonnet 5 Medium |
| 🟡 | 72 | 20 | 2/10 | 2/10 | fresh | 71 | Claude Sonnet 5 High |
| 🟡 | 72 | 30 | 2/10 | 2/10 | fresh | 71 | Claude Sonnet 5 XHigh |
| 🟡 | 72 | 40 | 2/10 | 2/10 | fresh | 71 | Claude Sonnet 5 Max |
| 🟡 | 71 | 1.5 | 2.5/15 | 2.5/15 | aging | 55 | GPT-5.4 No Thinking |
| 🟡 | 71 | 1.5 | 2.5/15 | 2.5/15 | aging | 55 | GPT-5.4 Low Thinking |
| 🟡 | 71 | 3 | 2.5/15 | 2.5/15 | aging | 55 | GPT-5.4 Medium Thinking |
| 🟡 | 71 | 3 | 5/30 | 2.5/15 | aging | 55 | GPT-5.4 No Thinking Fast |
| 🟡 | 71 | 3 | 5/30 | 2.5/15 | aging | 55 | GPT-5.4 Low Thinking Fast |
| 🟡 | 71 | 4 | 2.5/15 | 2.5/15 | aging | 55 | GPT-5.4 High Thinking |
| 🟡 | 71 | 6 | 5/30 | 2.5/15 | aging | 55 | GPT-5.4 Medium Thinking Fast |
| 🟡 | 71 | 8 | 5/30 | 2.5/15 | aging | 55 | GPT-5.4 High Thinking Fast |
| 🟡 | 71 | 12 | 2.5/15 | 2.5/15 | aging | 55 | GPT-5.4 XHigh Thinking |
| 🟡 | 71 | 24 | 5/30 | 2.5/15 | aging | 55 | GPT-5.4 XHigh Thinking Fast |
|  | 69 | 0.5 | 0.14/0.28 | 0.02/0.64 | fresh | 54 | DeepSeek V4 Flash High |
|  | 69 | 1 | 0.14/0.28 | 0.02/0.64 | fresh | 54 | DeepSeek V4 Flash Max |
|  | 69 | 1 | 1.4/4.4 | 0.05/7 | fresh | 66 | GLM-5.2 No Thinking |
|  | 69 | 1 | 2/12 | 2/12 | aging | 76 | Gemini 3.1 Pro Low Thinking |
|  | 69 | 1.5 | 1.4/4.4 | 0.05/7 | fresh | 66 | GLM-5.2 High |
|  | 69 | 2 | 1.4/4.4 | 0.05/7 | fresh | 66 | GLM-5.2 No Thinking 1M |
|  | 69 | 2 | 2/12 | 2/12 | aging | 76 | Gemini 3.1 Pro High Thinking |
|  | 69 | 3 | 1.4/4.4 | 0.05/7 | fresh | 66 | GLM-5.2 Max |
|  | 69 | 3 | 1.4/4.4 | 0.05/7 | fresh | 66 | GLM-5.2 High 1M |
|  | 69 | 3 | 1.32/3.96 | 0.66/1.98 | fresh | 42 | DeepSeek V4 Pro High |
|  | 69 | 3 | 1.32/3.96 | 0.66/1.98 | fresh | 42 | DeepSeek V4 Pro Max |
|  | 69 | 6 | 1.4/4.4 | 0.05/7 | fresh | 66 | GLM-5.2 Max 1M |
|  | 63 | 4 | 3/15 | 3/15 | aging | 45 | Claude Sonnet 4.6 |
|  | 63 | 6 | 3/15 | 3/15 | aging | 45 | Claude Sonnet 4.6 Thinking |
|  | 63 | 12 | 3/15 | 3/15 | aging | 45 | Claude Sonnet 4.6 1M |
|  | 63 | 16 | 3/15 | 3/15 | aging | 45 | Claude Sonnet 4.6 Thinking 1M |
|  | 62 | 1 | 0.95/4 | 0.65/3.41 | fresh | 35 | Kimi K2.6 |
|  | 61 | 1 | 0.95/4 | 0.67/3.35 | fresh | 39 | Kimi K2.7 |
|  | 58 | 35 | 4/20 | 4/20 | new | 76 | Claude Opus 5.5 Low |
| 🟢 | 58 | 45 | 4/20 | 4/20 | new | 76 | Claude Opus 5.5 Medium |
|  | 58 | 65 | 4/20 | 4/20 | new | 76 | Claude Opus 5.5 High |
| 🔴 | 58 | 125 | 4/20 | 4/20 | new | 76 | Claude Opus 5.5 XHigh |
| 🔴 | 58 | 150 | 4/20 | 4/20 | new | 76 | Claude Opus 5.5 Max |
| 🔴 | 58 | 150 | 8/40 | 4/20 | new | 76 | Claude Opus 5.5 Low Fast |
| 🔴 | 58 | 160 | 8/40 | 4/20 | new | 76 | Claude Opus 5.5 Medium Fast |
| 🔴 | 58 | 230 | 8/40 | 4/20 | new | 76 | Claude Opus 5.5 High Fast |
| 🔴 | 58 | 310 | 8/40 | 4/20 | new | 76 | Claude Opus 5.5 XHigh Fast |
| 🔴 | 58 | 320 | 8/40 | 4/20 | new | 76 | Claude Opus 5.5 Max Fast |
|  | 56 | 1.5 | 0.75/4.5 | 0.75/4.5 | aging | 83 | GPT-5.4 Mini Low Thinking |
|  | 56 | 1.5 | 0.75/4.5 | 0.75/4.5 | aging | 83 | GPT-5.4 Mini Medium Thinking |
|  | 56 | 4.5 | 0.75/4.5 | 0.75/4.5 | aging | 83 | GPT-5.4 Mini High Thinking |
|  | 56 | 12 | 0.75/4.5 | 0.75/4.5 | aging | 83 | GPT-5.4 Mini XHigh Thinking |
|  | 56 | 12 | 2/10 | 2/10 | new | 94 | Claude Sonnet 5.5 Low |
|  | 56 | 15 | 2/10 | 2/10 | new | 94 | Claude Sonnet 5.5 Medium |
|  | 56 | 20 | 2/10 | 2/10 | new | 94 | Claude Sonnet 5.5 High |
|  | 56 | 30 | 2/10 | 2/10 | new | 94 | Claude Sonnet 5.5 XHigh |
|  | 56 | 40 | 2/10 | 2/10 | new | 94 | Claude Sonnet 5.5 Max |
|  | 49 | 1 | 0.6/2.4 | 0.6/2.4 | fresh | 59 | Nemotron 3 Ultra None |
|  | 49 | 1 | 0.6/2.4 | 0.6/2.4 | fresh | 59 | Nemotron 3 Ultra Medium |
|  | 49 | 1 | 0.6/2.4 | 0.6/2.4 | fresh | 59 | Nemotron 3 Ultra High |
|  | 46 | 15 | 2/6 | 2/6 | new | 62 | Grok 4.7 Low |
|  | 46 | 20 | 2/6 | 2/6 | new | 62 | Grok 4.7 Medium |
|  | 46 | 30 | 2/6 | 2/6 | new | 62 | Grok 4.7 High |
|  | 46 | 55 | 2/6 | 2/6 | new | 62 | Grok 4.7 XHigh |
|  | 43 | 3 | 0.1/0.5 | 0.1/0.5 | new | 150 | Claude Haiku 5.5 Low |
|  | 43 | 4 | 0.1/0.5 | 0.1/0.5 | new | 150 | Claude Haiku 5.5 Medium |
|  | 43 | 5 | 0.1/0.5 | 0.1/0.5 | new | 150 | Claude Haiku 5.5 High |
|  | 43 | 8 | 0.1/0.5 | 0.1/0.5 | new | 150 | Claude Haiku 5.5 XHigh |
|  | 43 | 10 | 0.1/0.5 | 0.1/0.5 | new | 150 | Claude Haiku 5.5 Max |
|  | 42 | 3 | 0.5/2.5 | - | aging | 100 | SWE-1.7 Medium |
|  | 42 | 9 | 0.5/2.5 | - | aging | 100 | SWE-1.7 Max |
|  | 40 | 2 | 0.22/0.66 | 0.02/0.89 | fresh | 87 | DeepSeek V4.1 Flash High |
|  | 40 | 3 | 0.22/0.66 | 0.02/0.89 | fresh | 87 | DeepSeek V4.1 Flash Max |
|  | 39 | 9 | 2.5/12.5 | - | aging | 100 | SWE-1.7 Lightning Medium |
|  | 39 | 18 | 2.5/12.5 | - | aging | 100 | SWE-1.7 Lightning Max |
|  | 34 | 2 | 1.5/9 | 1.5/9 | fresh | 128 | Gemini 3.5 Flash Minimal |
|  | 34 | 2 | 1.5/7.5 | 1.5/9 | fresh | 128 | Gemini 3.6 Flash Minimal |
|  | 34 | 4 | 1.5/9 | 1.5/9 | fresh | 128 | Gemini 3.5 Flash Low |
|  | 34 | 4 | 1.5/7.5 | 1.5/9 | fresh | 128 | Gemini 3.6 Flash Low |
|  | 34 | 8 | 1.5/9 | 1.5/9 | fresh | 128 | Gemini 3.5 Flash Medium |
|  | 34 | 8 | 1.5/7.5 | 1.5/9 | fresh | 128 | Gemini 3.6 Flash Medium |
|  | 34 | 9 | 1.5/9 | 1.5/9 | fresh | 128 | Gemini 3.5 Flash High |
|  | 34 | 9 | 1.5/7.5 | 1.5/9 | fresh | 128 | Gemini 3.6 Flash High |
|  | 33 | 1 | 1.25/10 | 1.25/10 | aging | 75 | Gemini 2.5 Pro |
|  | 33 | 3 | 0.5/2.5 | - | aging | 100 | SWE-1.6 |
|  | 33 | 3 | 0.5/2.5 | - | aging | 100 | SWE-1.6 Fast |
|  | 33 | 1.5 | 1.75/14 | 1.75/14 | aging | 51 | GPT-5.3-Codex Low |
|  | 33 | 2 | 1.75/14 | 1.75/14 | aging | 51 | GPT-5.3-Codex Medium |
|  | 33 | 2.5 | 1.75/14 | 1.75/14 | aging | 51 | GPT-5.3-Codex High |
|  | 33 | 3 | 1.75/14 | 1.75/14 | aging | 51 | GPT-5.3-Codex X-High |
|  | 33 | 3 | 3.5/28 | 1.75/14 | aging | 51 | GPT-5.3-Codex Low Fast |
|  | 33 | 4 | 3.5/28 | 1.75/14 | aging | 51 | GPT-5.3-Codex Medium Fast |
|  | 33 | 5 | 3.5/28 | 1.75/14 | aging | 51 | GPT-5.3-Codex High Fast |
|  | 33 | 6 | 3.5/28 | 1.75/14 | aging | 51 | GPT-5.3-Codex XHigh Fast |
|  | 32 | 6 | 5/25 | 5/25 | aging | 40 | Claude Opus 4.6 |
|  | 32 | 8 | 5/25 | 5/25 | aging | 40 | Claude Opus 4.6 Thinking |
|  | 32 | 10 | 5/25 | 5/25 | aging | 40 | Claude Opus 4.6 1M |
|  | 32 | 12 | 5/25 | 5/25 | aging | 40 | Claude Opus 4.6 Thinking 1M |
|  | 30 | 1 | 1.75/14 | 1.75/14 | aging | 50 | GPT-5.2 Low Thinking |
|  | 30 | 1 | 1.75/14 | 1.75/14 | aging | 50 | GPT-5.2 No Thinking |
|  | 30 | 2 | 1.75/14 | 1.75/14 | aging | 50 | GPT-5.2 Medium Thinking |
|  | 30 | 2 | 3.5/28 | 1.75/14 | aging | 50 | GPT-5.2 Low Thinking Fast |
|  | 30 | 2 | 3.5/28 | 1.75/14 | aging | 50 | GPT-5.2 No Thinking Fast |
|  | 30 | 3 | 1.75/14 | 1.75/14 | aging | 50 | GPT-5.2 High Thinking |
|  | 30 | 4 | 3.5/28 | 1.75/14 | aging | 50 | GPT-5.2 Medium Thinking Fast |
|  | 30 | 6 | 3.5/28 | 1.75/14 | aging | 50 | GPT-5.2 High Thinking Fast |
|  | 30 | 8 | 1.75/14 | 1.75/14 | aging | 50 | GPT-5.2 XHigh Thinking |
|  | 30 | 16 | 3.5/28 | 1.75/14 | aging | 50 | GPT-5.2 XHigh Thinking Fast |
|  | 29 | 4 | 5/25 | 5/25 | aging | 47 | Claude Opus 4.5 |
|  | 29 | 5 | 5/25 | 5/25 | aging | 47 | Claude Opus 4.5 Thinking |
|  | 26 | 0.8 | 0.5/3 | 0.5/3 | aging | 77 | Gemini 3 Flash Minimal |
|  | 26 | 1 | 0.5/3 | 0.5/3 | aging | 77 | Gemini 3 Flash Low |
|  | 26 | 1 | 0.5/3 | 0.5/3 | aging | 77 | Gemini 3 Flash Medium |
|  | 26 | 1.8 | 0.5/3 | 0.5/3 | aging | 77 | Gemini 3 Flash High |
|  | 20 | 1 | 2/8 | 2/8 | aging | 40 | o3 |
|  | 20 | 1 | 2/8 | 2/8 | aging | 40 | o3 High Reasoning |
|  | 13 | 1 | 2/8 | 2/8 | aging | 80 | GPT-4.1 |
|  | 8 | 1 | 2.5/10 | 2.5/10 | old | 60 | GPT-4o |
|  | ? | 0.5 | 1.25/10 | - | - | - | GPT-5 Low Thinking |
|  | ? | 0.5 | 0.2/1.5 | - | - | - | Grok Code Fast 1 |
|  | ? | 0.5 | 1.25/10 | - | - | - | GPT-5.1 No Thinking |
|  | ? | 0.5 | 1.25/10 | - | - | - | GPT-5.1 Low Thinking |
|  | ? | 1 | 1/5 | - | - | - | Claude Haiku 4.5 |
|  | ? | 1 | 1.25/10 | - | - | - | GPT-5 Medium Thinking |
|  | ? | 1 | 1.25/10 | - | - | - | GPT-5.1 Medium Thinking |
|  | ? | 1 | 2.5/20 | - | - | - | GPT-5.1 No Thinking Fast |
|  | ? | 1 | 2.5/20 | - | - | - | GPT-5.1 Low Thinking Fast |
|  | ? | 2 | 1.25/10 | - | - | - | GPT-5 High Thinking |
|  | ? | 2 | 1.25/10 | - | - | - | GPT-5.1 High Thinking |
|  | ? | 2 | 2.5/20 | - | - | - | GPT-5.1 Medium Thinking Fast |

**Score** — Artificial Analysis coding/intelligence index via OpenRouter (0-100).
**Markers** — 🟢 free/promo/featured (grab it), 🟡 powerful at a fair price (score ≥70, worth it occasionally), 🔴 ≥100 credits/prompt (money pit).
**FREE** — 0-credit promo as marketed by Windsurf (SWE). **PROMO** — discounted window, still per-prompt credits.  
**WS $/1M** — Windsurf extra-usage prices; **OR $/1M** — OpenRouter reference. SWE scores are estimates.  
**Age** — release date from OpenRouter: new <1mo, fresh <6mo, aging <18mo, old ≥18mo.  
**TPS** — median output tokens/sec across OpenRouter providers (speeds.json snapshot).

