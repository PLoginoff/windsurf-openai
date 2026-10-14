# Рекомендации по моделям Windsurf

> Практические советы по подписке Windsurf Pro (октябрь 2026) + полная таблица моделей.
> Регенерация таблицы: `npx tsx cli.ts recommend --all --md`; обновление TPS: `npx tsx cli.ts speeds`.

## Что реально использовать

**Коротко:** SWE-2 для бесплатной работы, GLM-5.3 Max / Kimi K3 на кредитах подписки, Gemini 3.8 Flash пока промо активно, а фронтлайн-модели (Claude/GPT) докупать в Extra-Usage — там цена рыночная.

1. **Бесплатная рабочая лошадка (`SWE-2 High ★50 free`):**
   - Стоит **0 кредитов**, пока открыто промо-окно.
   - Идеальна для рутины: правки, рефакторинг, изучение директорий, запуск инструментов, мелкие баги. Не жгите платные кредиты на простые задачи.
2. **Лучшее на кредитах подписки (`GLM-5.3 Max ★75 $` и `Kimi K3 High ★76 $`):**
   - **GLM-5.3 Max** стоит всего **1 кредит за промпт**, показывая топовый бенчмарк-интеллект (★75). Это безоговорочный лидер по соотношению цена/качество на платформе.
   - **Kimi K3** — отличная альтернатива за 4–6 кредитов, когда нужен другой взгляд.
   - **Claude Opus 5.5 (45cr)** и **Claude Fable 5.1 (50–175cr)** берегите для самых сложных архитектурных задач.
3. **Extra-Usage (доплата реальными деньгами после исчерпания кредитов):**
   - **Можно спокойно покупать в Windsurf:** западные фронтлайн-модели (**Claude Opus/Sonnet 5.5**, **GPT-5.4**, **Gemini 3.8 Flash**) — наценки нет, цены совпадают с OpenRouter и официальными API один в один (Claude Opus 5.5 — $4/$20 за 1M токенов и там, и там).
   - **НЕ покупайте через Windsurf Extra-Usage:** китайские открытые модели — **GLM-5.3**, **GLM-5.2**, **Kimi K3**. Windsurf накручивает до **20x наценки на входные токены** ($1.40/1M против $0.08/1M на OpenRouter). Если кредиты подписки кончились — переходите на OpenRouter напрямую!
   - **Исключение:** **GLM-5.3 Flash** — цена в Windsurf ($0.15/$0.5) после подписки вполне ок, примерно на уровне OpenRouter ($0.04/$0.9). Дешёвый и быстрый запасной вариант, когда кредиты кончились.
   - **Исключение:** **Gemini 3.7/3.8 Flash** — наценки нет ($0.75/$3.75, как на OpenRouter) и ★76 интеллекта. Лучшая по цене/качеству модель для покупки в Extra-Usage, когда промо-окно закроется.

Запускайте `npx tsx cli.ts recommend` в любой момент — получите живую картину по своему аккаунту.

## Все модели

> Снапшот плана **Pro**, 201 модель, сгенерировано 2026-10-14.
> Регенерация: `npx tsx cli.ts recommend --all --md`.

| Tier | Score | Credits | WS $/1M in/out | OR $/1M in/out | Age | TPS | Model |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 🟢 FREE | 50 | 0 | - | - | fresh | 100 | SWE-2 Medium |
| 🟢 FREE | 50 | 0 | - | - | fresh | 100 | SWE-2 High |
| 🟢 FREE | 50 | 0 | - | - | fresh | 100 | SWE-2 Max |
| 🟡 PROMO | 76 | 6 | 0.75/3.75 | 0.75/3.75 | fresh | 77 | Gemini 3.7 Flash Low |
| 🟡 PROMO | 76 | 6 | 0.75/3.75 | 0.75/3.75 | fresh | 77 | Gemini 3.8 Flash Low |
| 🟡 PROMO | 76 | 8 | 0.75/3.75 | 0.75/3.75 | fresh | 77 | Gemini 3.8 Flash Medium |
| 🟡 PROMO | 76 | 8 | 0.75/3.75 | 0.75/3.75 | fresh | 77 | Gemini 3.7 Flash Medium |
| 🟡 PROMO | 76 | 10 | 0.75/3.75 | 0.75/3.75 | fresh | 77 | Gemini 3.7 Flash High |
| 🟡 PROMO | 76 | 10 | 0.75/3.75 | 0.75/3.75 | fresh | 77 | Gemini 3.8 Flash High |
| 🟡 PROMO | ? | 50 | 1/5 | - | - | - | Gemini 4 Argon Low |
| 🟡 PROMO | ? | 70 | 1/5 | - | - | - | Gemini 4 Argon Medium |
| 🟡 PROMO | ? | 90 | 1/5 | - | - | - | Gemini 4 Argon High |
|  | 82 | 40 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5 Low |
|  | 82 | 50 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5 Medium |
|  | 82 | 70 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5 High |
|  | 82 | 80 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5 XHigh |
| 🔴 | 82 | 100 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5 Max |
| 🔴 | 82 | 150 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5.1 Low |
| 🔴 | 82 | 175 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5.1 Medium |
| 🔴 | 82 | 200 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5.1 High |
| 🔴 | 82 | 225 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5.1 XHigh |
| 🔴 | 82 | 250 | 10/50 | 10/50 | fresh | 50 | Claude Fable 5.1 Max |
|  | 78 | 75 | 5/25 | 5/25 | fresh | 70 | Claude Opus 5 Low |
|  | 78 | 80 | 5/25 | 5/25 | fresh | 70 | Claude Opus 5 Medium |
| 🔴 | 78 | 115 | 5/25 | 5/25 | fresh | 70 | Claude Opus 5 High |
| 🔴 | 78 | 150 | 10/50 | 5/25 | fresh | 70 | Claude Opus 5 Low Fast |
| 🔴 | 78 | 155 | 5/25 | 5/25 | fresh | 70 | Claude Opus 5 XHigh |
| 🔴 | 78 | 160 | 5/25 | 5/25 | fresh | 70 | Claude Opus 5 Max |
| 🔴 | 78 | 160 | 10/50 | 5/25 | fresh | 70 | Claude Opus 5 Medium Fast |
| 🔴 | 78 | 230 | 10/50 | 5/25 | fresh | 70 | Claude Opus 5 High Fast |
| 🔴 | 78 | 310 | 10/50 | 5/25 | fresh | 70 | Claude Opus 5 XHigh Fast |
| 🔴 | 78 | 320 | 10/50 | 5/25 | fresh | 70 | Claude Opus 5 Max Fast |
|  | 77 | 10 | 2/6 | 2/6 | fresh | 55 | Grok 4.6 Low |
|  | 77 | 20 | 2/6 | 2/6 | fresh | 55 | Grok 4.6 Medium |
|  | 77 | 25 | 2/6 | 2/6 | fresh | 55 | Grok 4.6 High |
|  | 77 | 30 | 2/6 | 2/6 | fresh | 55 | Grok 4.6 XHigh |
|  | 76 | 4 | 3/15 | 0.7/15 | fresh | 49 | Kimi K3 Low |
|  | 76 | 6 | 3/15 | 0.7/15 | fresh | 49 | Kimi K3 High |
|  | 76 | 9 | 3/15 | 0.7/15 | fresh | 49 | Kimi K3 Max |
|  | 75 | 9 | 5/30 | 5/30 | fresh | 57 | GPT-5.5 No Thinking |
|  | 75 | 12 | 5/30 | 5/30 | fresh | 57 | GPT-5.5 Low Thinking |
|  | 75 | 15 | 5/30 | 5/30 | fresh | 57 | GPT-5.5 Medium Thinking |
|  | 75 | 22.5 | 12.5/75 | 5/30 | fresh | 57 | GPT-5.5 No Thinking Fast |
|  | 75 | 24 | 5/30 | 5/30 | fresh | 57 | GPT-5.5 High Thinking |
|  | 75 | 30 | 12.5/75 | 5/30 | fresh | 57 | GPT-5.5 Low Thinking Fast |
|  | 75 | 36 | 5/30 | 5/30 | fresh | 57 | GPT-5.5 XHigh Thinking |
|  | 75 | 37.5 | 12.5/75 | 5/30 | fresh | 57 | GPT-5.5 Medium Thinking Fast |
|  | 75 | 60 | 12.5/75 | 5/30 | fresh | 57 | GPT-5.5 High Thinking Fast |
|  | 75 | 90 | 12.5/75 | 5/30 | fresh | 57 | GPT-5.5 XHigh Thinking Fast |
|  | 75 | 1 | 1.4/4.4 | 0.08/4.8 | fresh | 85 | GLM-5.3 Low |
|  | 75 | 1 | 1.4/4.4 | 0.08/4.8 | fresh | 85 | GLM-5.3 High |
|  | 75 | 1 | 1.4/4.4 | 0.08/4.8 | fresh | 85 | GLM-5.3 Max |
|  | 74 | 20 | 5/25 | 5/25 | fresh | 76 | Claude Opus 4.8 Low |
|  | 74 | 25 | 5/25 | 5/25 | fresh | 76 | Claude Opus 4.8 Medium |
|  | 74 | 35 | 5/25 | 5/25 | fresh | 76 | Claude Opus 4.8 High |
|  | 74 | 40 | 5/25 | 5/25 | fresh | 76 | Claude Opus 4.8 XHigh |
|  | 74 | 40 | 10/50 | 5/25 | fresh | 76 | Claude Opus 4.8 Low Fast |
|  | 74 | 50 | 5/25 | 5/25 | fresh | 76 | Claude Opus 4.8 Max |
|  | 74 | 50 | 10/50 | 5/25 | fresh | 76 | Claude Opus 4.8 Medium Fast |
|  | 74 | 70 | 10/50 | 5/25 | fresh | 76 | Claude Opus 4.8 High Fast |
|  | 74 | 80 | 10/50 | 5/25 | fresh | 76 | Claude Opus 4.8 XHigh Fast |
| 🔴 | 74 | 100 | 10/50 | 5/25 | fresh | 76 | Claude Opus 4.8 Max Fast |
|  | 74 | 20 | 5/25 | 5/25 | fresh | 56 | Claude Opus 4.7 Low |
|  | 74 | 40 | 5/25 | 5/25 | fresh | 56 | Claude Opus 4.7 Medium |
|  | 74 | 60 | 5/25 | 5/25 | fresh | 56 | Claude Opus 4.7 High |
|  | 74 | 65 | 5/25 | 5/25 | fresh | 56 | Claude Opus 4.7 XHigh |
|  | 74 | 75 | 5/25 | 5/25 | fresh | 56 | Claude Opus 4.7 Max |
|  | 72 | 0.1 | 0.3/0.5 | 2/6 | fresh | 54 | xAI Grok-3 mini Thinking |
|  | 72 | 1 | 3/15 | 2/6 | fresh | 54 | xAI Grok-3 |
|  | 72 | 5 | 2/6 | 2/6 | fresh | 54 | Grok 4.5 Low |
|  | 72 | 8 | 2/6 | 2/6 | fresh | 54 | Grok 4.5 Medium |
|  | 72 | 10 | 2/6 | 2/6 | fresh | 54 | Grok 4.5 High |
|  | 72 | 1 | 0.15/0.5 | 0.04/0.9 | fresh | 67 | GLM-5.3 Flash Low |
|  | 72 | 1 | 0.15/0.5 | 0.04/0.9 | fresh | 67 | GLM-5.3 Flash High |
|  | 72 | 1 | 0.15/0.5 | 0.04/0.9 | fresh | 67 | GLM-5.3 Flash Max |
|  | 72 | 12 | 2/10 | 2/10 | fresh | 71 | Claude Sonnet 5 Low |
|  | 72 | 15 | 2/10 | 2/10 | fresh | 71 | Claude Sonnet 5 Medium |
|  | 72 | 20 | 2/10 | 2/10 | fresh | 71 | Claude Sonnet 5 High |
|  | 72 | 30 | 2/10 | 2/10 | fresh | 71 | Claude Sonnet 5 XHigh |
|  | 72 | 40 | 2/10 | 2/10 | fresh | 71 | Claude Sonnet 5 Max |
|  | 71 | 1.5 | 2.5/15 | 2.5/15 | aging | 55 | GPT-5.4 No Thinking |
|  | 71 | 1.5 | 2.5/15 | 2.5/15 | aging | 55 | GPT-5.4 Low Thinking |
|  | 71 | 3 | 2.5/15 | 2.5/15 | aging | 55 | GPT-5.4 Medium Thinking |
|  | 71 | 3 | 5/30 | 2.5/15 | aging | 55 | GPT-5.4 No Thinking Fast |
|  | 71 | 3 | 5/30 | 2.5/15 | aging | 55 | GPT-5.4 Low Thinking Fast |
|  | 71 | 4 | 2.5/15 | 2.5/15 | aging | 55 | GPT-5.4 High Thinking |
|  | 71 | 6 | 5/30 | 2.5/15 | aging | 55 | GPT-5.4 Medium Thinking Fast |
|  | 71 | 8 | 5/30 | 2.5/15 | aging | 55 | GPT-5.4 High Thinking Fast |
|  | 71 | 12 | 2.5/15 | 2.5/15 | aging | 55 | GPT-5.4 XHigh Thinking |
|  | 71 | 24 | 5/30 | 2.5/15 | aging | 55 | GPT-5.4 XHigh Thinking Fast |
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
|  | 58 | 45 | 4/20 | 4/20 | new | 76 | Claude Opus 5.5 Medium |
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

**Score** — индекс coding/intelligence от Artificial Analysis через OpenRouter (0-100).
**FREE** — бесплатное промо, как его подаёт Windsurf (линейка SWE). **PROMO** — скидочное окно, но кредиты за промпт всё же списываются.
**WS $/1M** — цены Windsurf Extra-Usage; **OR $/1M** — ориентир OpenRouter. Оценки SWE — ручные.
**Age** — дата релиза из OpenRouter: new <1мес, fresh <6мес, aging <18мес, old ≥18мес.
**TPS** — медиана скорости генерации (токенов/сек) по провайдерам OpenRouter (снапшот speeds.json).
