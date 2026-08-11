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
  if (score >= 85) return "HOT OPPORTUNITY";
  if (score >= 75) return "STRONG FIT";
  if (score >= 60) return "WORTH A LOOK";
  return "MONITOR";
}

/** @deprecated Prefer formatMoney — kept for legacy dashboard */
export const formatCurrency = formatMoney;

export function formatShortDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function scoreTone(score: number) {
  if (score >= 80) return "hot" as const;
  if (score >= 65) return "open" as const;
  if (score >= 50) return "warm" as const;
  return "cool" as const;
}
