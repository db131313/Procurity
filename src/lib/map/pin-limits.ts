/** Shared map pin payload caps (safe for client + server imports). */

/** Default pin payload — high enough for a full-metro overview (NYC ~2k). */
export const MAP_PIN_DEFAULT_LIMIT = 2000;
/** Hard cap — protect serverless payloads on extreme zoom-outs. */
export const MAP_PIN_MAX_LIMIT = 2500;
