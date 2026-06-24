export function fmtHours(h: number): string {
  return Math.round(h).toLocaleString("en-US");
}

export function fmtFte(f: number): string {
  return f.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function fmtPct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function fmtNumber(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
