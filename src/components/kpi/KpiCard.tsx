export function KpiCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneColor =
    tone === "good"
      ? "text-good"
      : tone === "warn"
      ? "text-warn"
      : tone === "bad"
      ? "text-bad"
      : "text-text";
  return (
    <div className="card p-4">
      <div className="card-title">{label}</div>
      <div className={`text-2xl font-bold mt-2 ${toneColor}`}>{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}
