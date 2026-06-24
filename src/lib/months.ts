// Month-axis helpers. A month is canonically represented as a UTC
// first-of-month Date plus an integer monthKey (YYYYMM, e.g. 202601).

export const HORIZON_START_KEY = 202601; // fixed anchor (Jan 2026)
export const HORIZON_MONTHS = 24;

/** Working hours assumed available per FTE per month. */
export const HOURS_PER_FTE_MONTH = 160;

export function monthKeyOf(date: Date): number {
  return date.getUTCFullYear() * 100 + (date.getUTCMonth() + 1);
}

export function dateFromKey(key: number): Date {
  const year = Math.floor(key / 100);
  const month = key % 100;
  return new Date(Date.UTC(year, month - 1, 1));
}

/** Advance a monthKey by n months (n can be negative). */
export function addMonths(key: number, n: number): number {
  const year = Math.floor(key / 100);
  const month = key % 100;
  const idx = year * 12 + (month - 1) + n;
  return Math.floor(idx / 12) * 100 + (idx % 12) + 1;
}

/** Inclusive count of months between two keys. */
export function monthsBetween(startKey: number, endKey: number): number {
  const sy = Math.floor(startKey / 100);
  const sm = startKey % 100;
  const ey = Math.floor(endKey / 100);
  const em = endKey % 100;
  return ey * 12 + em - (sy * 12 + sm) + 1;
}

/** The full horizon axis as monthKeys. */
export function horizonKeys(
  startKey = HORIZON_START_KEY,
  count = HORIZON_MONTHS
): number[] {
  return Array.from({ length: count }, (_, i) => addMonths(startKey, i));
}

const MONTH_LABELS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTH_LABELS_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function monthLabel(key: number, locale: "pt" | "en" = "en"): string {
  const month = (key % 100) - 1;
  const year = Math.floor(key / 100);
  const labels = locale === "pt" ? MONTH_LABELS_PT : MONTH_LABELS_EN;
  return `${labels[month]}/${String(year).slice(2)}`;
}

export const HORIZON_END_KEY = addMonths(HORIZON_START_KEY, HORIZON_MONTHS - 1);
