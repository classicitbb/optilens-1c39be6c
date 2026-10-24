// Order-age shading bands, mirroring the lab system's threshold colours.
// Rows are tinted lightly (low alpha) so they read as a hint, not an alarm wall.
export interface OrderAgeBand {
  maxDays: number;
  label: string;
  rgb: string;
}

export const ORDER_AGE_BANDS: OrderAgeBand[] = [
  { maxDays: 5, label: "0–5 days", rgb: "135, 206, 250" },
  { maxDays: 7, label: "5–7 days", rgb: "144, 208, 128" },
  { maxDays: 11, label: "7–11 days", rgb: "204, 230, 0" },
  { maxDays: 14, label: "11–14 days", rgb: "255, 170, 0" },
  { maxDays: 17, label: "14–17 days", rgb: "230, 120, 30" },
  { maxDays: 28, label: "17–28 days", rgb: "240, 50, 50" },
  { maxDays: Infinity, label: "Over 28 days", rgb: "150, 40, 20" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function orderAgeDays(receivedAt: string | null | undefined, now: Date = new Date()): number | null {
  if (!receivedAt) return null;
  const received = new Date(receivedAt).getTime();
  if (Number.isNaN(received)) return null;
  return Math.max(0, (now.getTime() - received) / DAY_MS);
}

export function orderAgeBand(receivedAt: string | null | undefined, now: Date = new Date()): OrderAgeBand | null {
  const days = orderAgeDays(receivedAt, now);
  if (days === null) return null;
  return ORDER_AGE_BANDS.find((band) => days < band.maxDays) ?? null;
}

export const orderAgeTint = (band: OrderAgeBand, alpha = 0.22) => `rgba(${band.rgb}, ${alpha})`;
