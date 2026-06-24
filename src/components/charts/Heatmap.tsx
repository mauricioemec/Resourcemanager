import { HOURS_PER_FTE_MONTH } from "@/lib/queries/facts";
import type { Heatmap as HeatmapData } from "@/lib/queries";

// Dense matrix via CSS grid + color scale (no chart lib needed).

function gapColor(fteGap: number, maxAbs: number): string {
  // positive gap = shortage (red); negative = surplus (green)
  const t = maxAbs > 0 ? Math.min(1, Math.abs(fteGap) / maxAbs) : 0;
  if (Math.abs(fteGap) < 0.15) return "#1c2440";
  if (fteGap > 0) {
    // red scale
    const a = 0.25 + 0.65 * t;
    return `rgba(239,68,68,${a.toFixed(2)})`;
  }
  const a = 0.2 + 0.6 * t;
  return `rgba(34,197,94,${a.toFixed(2)})`;
}

function utilColor(u: number): string {
  if (u <= 0) return "#1c2440";
  if (u < 0.7) return "rgba(34,197,94,0.45)";
  if (u < 0.9) return "rgba(132,204,22,0.5)";
  if (u < 1.0) return "rgba(245,158,11,0.55)";
  return "rgba(239,68,68,0.7)";
}

export function Heatmap({ data, unit = "fte" }: { data: HeatmapData; unit?: "fte" | "hours" }) {
  const div = unit === "fte" ? HOURS_PER_FTE_MONTH : 1;
  // for gap, scale by fte gap; compute max abs
  let maxAbs = 0;
  if (data.metric === "gap") {
    for (const row of data.cells)
      for (const v of row) maxAbs = Math.max(maxAbs, Math.abs(v / div));
  }

  const cell = (v: number) => {
    if (data.metric === "utilization") return utilColor(v);
    if (data.metric === "gap") return gapColor(v / div, maxAbs);
    // demand
    const t = maxAbs > 0 ? v / div / maxAbs : 0;
    return `rgba(91,141,239,${(0.2 + 0.6 * Math.min(1, t)).toFixed(2)})`;
  };

  const fmt = (v: number) => {
    if (data.metric === "utilization") return `${Math.round(v * 100)}%`;
    const f = v / div;
    return unit === "fte" ? f.toFixed(1) : Math.round(v).toString();
  };

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <div className="inline-grid gap-[3px]" style={{ gridTemplateColumns: `120px repeat(${data.colKeys.length}, minmax(38px, 1fr))` }}>
        <div />
        {data.colKeys.map((c) => (
          <div key={c.key} className="text-[10px] text-muted text-center pb-1 font-medium">
            {c.label}
          </div>
        ))}
        {data.rowKeys.map((r, ri) => (
          <Row key={r.key} label={r.label} color={r.color}>
            {data.cells[ri].map((v, ci) => (
              <div
                key={ci}
                title={`${r.label} · ${data.colKeys[ci].label}: ${fmt(v)}`}
                className="h-8 rounded-[4px] flex items-center justify-center text-[10px] font-medium text-white/90"
                style={{ background: cell(v) }}
              >
                {Math.abs(data.metric === "utilization" ? v : v / div) >= (data.metric === "utilization" ? 0.001 : 0.15)
                  ? fmt(v)
                  : ""}
              </div>
            ))}
          </Row>
        ))}
      </div>
    </div>
  );
}

function Row({
  label,
  color,
  children,
}: {
  label: string;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="text-xs text-muted flex items-center gap-2 pr-2">
        {color && <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />}
        <span className="truncate font-medium text-text">{label}</span>
      </div>
      {children}
    </>
  );
}

export function HeatmapLegend({ metric }: { metric: "gap" | "utilization" | "demand" }) {
  if (metric === "gap")
    return (
      <div className="flex items-center gap-4 text-xs text-muted mt-3">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(239,68,68,0.8)" }} /> Shortage / Falta
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(34,197,94,0.7)" }} /> Surplus / Sobra
        </span>
      </div>
    );
  if (metric === "utilization")
    return (
      <div className="flex items-center gap-4 text-xs text-muted mt-3">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: "rgba(34,197,94,0.45)" }} /> &lt;70%</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: "rgba(245,158,11,0.55)" }} /> 90–100%</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: "rgba(239,68,68,0.7)" }} /> &gt;100%</span>
      </div>
    );
  return null;
}
