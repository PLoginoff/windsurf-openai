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
  "kimi-k3-high",             // 6cr — strong open model
  "claude-opus-5-5-medium",  // 45cr — heavy lifting
  "gpt-6-astra-medium",      // 200cr — the big gun
];
