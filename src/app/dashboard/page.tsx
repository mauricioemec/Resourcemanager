import { PageHeader, Section } from "@/components/ui/PageHeader";
import { KpiCard } from "@/components/kpi/KpiCard";
import { Heatmap, HeatmapLegend } from "@/components/charts/Heatmap";
import { DemandCapacityArea, UtilizationLine, SingleBar } from "@/components/charts/Charts";
import { getKpis, getRollup, getHeatmap, getTrend } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import { fmtFte, fmtHours, fmtPct, fmtNumber } from "@/lib/format";
import { HOURS_PER_FTE_MONTH } from "@/lib/queries/facts";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const t = getT();
  const [kpis, byDiscipline, byRegion, heat, trend] = await Promise.all([
    getKpis(),
    getRollup("discipline"),
    getRollup("region"),
    getHeatmap("region", "discipline", "gap"),
    getTrend(),
  ]);

  const demandByDisc = [...byDiscipline]
    .sort((a, b) => b.demand - a.demand)
    .map((d) => ({ label: d.label, demand: Math.round(d.demand), color: d.color }));

  // top overloaded region×discipline (positive gap, in FTE)
  const overloaded: { label: string; gapFte: number }[] = [];
  heat.rowKeys.forEach((r, ri) => {
    heat.colKeys.forEach((c, ci) => {
      const gapFte = heat.cells[ri][ci] / HOURS_PER_FTE_MONTH;
      if (gapFte > 0) overloaded.push({ label: `${r.label} · ${c.label}`, gapFte });
    });
  });
  overloaded.sort((a, b) => b.gapFte - a.gapFte);

  return (
    <>
      <PageHeader title={t("nav.dashboard")} subtitle={t("app.subtitle")} />

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
        <KpiCard label={t("kpi.demand")} value={fmtHours(kpis.demand)} sub={t("unit.hours")} />
        <KpiCard label={t("kpi.capacity")} value={fmtHours(kpis.capacity)} sub={t("unit.hours")} />
        <KpiCard label={t("kpi.allocated")} value={fmtHours(kpis.allocated)} sub={t("unit.hours")} />
        <KpiCard
          label={t("kpi.utilization")}
          value={fmtPct(kpis.utilization)}
          tone={kpis.utilization > 0.95 ? "bad" : kpis.utilization > 0.8 ? "warn" : "good"}
        />
        <KpiCard
          label={t("kpi.gap")}
          value={`${kpis.netGapFte > 0 ? "+" : ""}${fmtFte(kpis.netGapFte)}`}
          sub={t("unit.fte")}
          tone={kpis.netGapFte > 0 ? "bad" : "good"}
        />
        <KpiCard label={t("kpi.projects")} value={fmtNumber(kpis.projects)} />
        <KpiCard label={t("kpi.resources")} value={fmtNumber(kpis.resources)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        <Section title={t("heatmap.regionByDiscipline")} className="xl:col-span-2">
          <Heatmap data={heat} unit="fte" />
          <HeatmapLegend metric="gap" />
        </Section>
        <Section title={t("common.overloaded")}>
          <ul className="space-y-2">
            {overloaded.slice(0, 8).map((o) => (
              <li key={o.label} className="flex items-center justify-between text-sm">
                <span className="text-text">{o.label}</span>
                <span className="font-semibold text-bad">+{o.gapFte.toFixed(1)} FTE</span>
              </li>
            ))}
            {overloaded.length === 0 && <li className="text-sm text-muted">{t("common.none")}</li>}
          </ul>
        </Section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <Section title={t("chart.demandVsCapacity")}>
          <DemandCapacityArea data={trend} />
        </Section>
        <Section title={t("chart.utilizationTrend")}>
          <UtilizationLine data={trend} />
        </Section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Section title={t("chart.demandByDiscipline")}>
          <SingleBar data={demandByDisc} dataKey="demand" />
        </Section>
        <Section title={t("chart.byRegion")}>
          <RegionTable rows={byRegion} t={t} />
        </Section>
      </div>
    </>
  );
}

function RegionTable({
  rows,
  t,
}: {
  rows: Awaited<ReturnType<typeof getRollup>>;
  t: (k: string) => string;
}) {
  return (
    <table className="text-sm">
      <thead>
        <tr className="text-muted text-left border-b border-border">
          <th className="py-2 font-medium">{t("table.region")}</th>
          <th className="py-2 font-medium text-right">{t("metric.demand")}</th>
          <th className="py-2 font-medium text-right">{t("metric.capacity")}</th>
          <th className="py-2 font-medium text-right">{t("metric.utilization")}</th>
          <th className="py-2 font-medium text-right">{t("metric.gap")} (FTE)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const gapFte = r.gap / HOURS_PER_FTE_MONTH;
          return (
            <tr key={r.key} className="border-b border-border/50">
              <td className="py-2">{r.label}</td>
              <td className="py-2 text-right">{fmtHours(r.demand)}</td>
              <td className="py-2 text-right">{fmtHours(r.capacity)}</td>
              <td className={`py-2 text-right ${r.utilization > 0.95 ? "text-bad" : r.utilization > 0.8 ? "text-warn" : "text-good"}`}>
                {fmtPct(r.utilization)}
              </td>
              <td className={`py-2 text-right font-medium ${gapFte > 0 ? "text-bad" : "text-good"}`}>
                {gapFte > 0 ? "+" : ""}
                {gapFte.toFixed(1)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
