import { formatDistanceToNow } from "date-fns";

export function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatMoneyRange(low: number, high: number) {
  const fmt = (n: number) => {
    if (n >= 1000) return `$${Math.round(n / 1000)}K`;
    return formatMoney(n);
  };
  return `${fmt(low)}–${fmt(high)}`;
}

export function relativeTime(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function scoreBandLabel(score: number) {
  if (score >= 90) return "HOT OPPORTUNITY";
  if (score >= 80) return "STRONG FIT";
  if (score >= 60) return "WORTH A LOOK";
  return "MONITOR";
}
