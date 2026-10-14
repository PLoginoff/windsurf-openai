/**
 * Featured models — pinned to the top of the model list, in this exact order.
 *
 * Matched by exact model_uid from Windsurf's GetUserStatus; unknown uids are
 * silently ignored (e.g. when a model is retired or not on your plan).
 * Edit this list to taste — no other file needs to change.
 */
export const FEATURED_UIDS: string[] = [
  "swe-2-high",               // promo — free while the window lasts, fast
  "glm-5-3-max",              // 1cr — cheapest real workhorse
  "glm-5-3-flash-max",       // 1cr — cheap & fast fallback when out of credits
  "kimi-k3-high",             // 6cr — strong open model
  "claude-opus-5-5-medium",  // 45cr — heavy lifting
];

/**
 * Traffic-light markers for `recommend --all --md` (RECOMMENDATIONS tables).
 * Independent of FEATURED_UIDS (that list only pins models in the Zed picker).
 *
 * GREEN_FAMILIES — grab-it families, matched by base uid prefix (covers every
 * effort/variant suffix).
 * YELLOW_FAMILIES — powerful at a fair price, occasionally worth it; same
 * prefix matching. Anything ≥100 credits/prompt stays 🔴 regardless.
 */
export const GREEN_FAMILIES: string[] = [
  "glm-5-3",      // 1cr workhorse line — best value on the platform
  "kimi-k3",      // strong open model, cheap on subscription credits
];

export const YELLOW_FAMILIES: string[] = [
  "claude-fable-5",       // ★82 top intelligence, 40-80cr — for the hardest stuff
  "claude-opus-5",        // ★78, 75-160cr
  "gpt-5-5",              // ★75 frontier
  "grok-4-6",             // ★77, 10-30cr
  "claude-sonnet-5",      // ★72 solid mid
  "gpt-5-4",              // ★71 aging but capable
  "gemini-4-argon",       // ★? new, but pricey even at promo (50-90cr)
];
