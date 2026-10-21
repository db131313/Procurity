/** Construction heat ramp for the public home map (cool → mid → hot). */
export const HEAT = {
  cool: "#9FB4CC",
  mid: "#F2B544",
  hot: "#F26B3A",
} as const;

export function pinColorHeat(score: number): string {
  if (score >= 90) return HEAT.hot;
  if (score >= 80) return "#F08A3C";
  if (score >= 70) return HEAT.mid;
  if (score >= 60) return "#C4B89A";
  return HEAT.cool;
}

/** MapLibre interpolate expression for heat-colored circles. */
export const HEAT_COLOR_EXPR = [
  "interpolate",
  ["linear"],
  ["get", "score"],
  40,
  HEAT.cool,
  60,
  "#C4B89A",
  70,
  HEAT.mid,
  85,
  "#F08A3C",
  100,
  HEAT.hot,
] as const;
