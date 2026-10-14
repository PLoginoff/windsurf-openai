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
 * Green-marked model families in `recommend --all --md` (RECOMMENDATIONS tables).
 * Matches by base uid prefix — covers every effort/variant suffix in the family.
 * Only affects table markers, NOT the Zed model list (that's FEATURED_UIDS above).
 */
export const GREEN_FAMILIES: string[] = [
  "glm-5-3",      // 1cr workhorse line — best value on the platform
  "kimi-k3",      // strong open model, cheap on subscription credits
];
