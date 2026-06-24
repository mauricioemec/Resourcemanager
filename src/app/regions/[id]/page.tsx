import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader, Section } from "@/components/ui/PageHeader";
import { KpiCard } from "@/components/kpi/KpiCard";
import { Heatmap, HeatmapLegend } from "@/components/charts/Heatmap";
import { StaffingArea, UtilizationLine } from "@/components/charts/Charts";
import { getKpis, getHeatmap, getTrend, getStaffingCurve } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import { fmtHours, fmtFte, fmtPct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RegionDetail({ params }: { params: { id: string } }) {
  const t = getT();
  const region = await prisma.region.findUnique({ where: { id: params.id } });
  if (!region) notFound();

  const filter = { regionId: region.id };
  const [kpis, heat, trend, staffing, roster] = await Promise.all([
    getKpis(filter),
    getHeatmap("discipline", "month", "gap", filter),
    getTrend(filter),
    getStaffingCurve(filter),
    prisma.resource.findMany({
      where: { regionId: region.id, active: true },
      include: { discipline: true },
      orderBy: { name: "asc" },
      take: 40,
    }),
  ]);

  return (
    <>
      <PageHeader title={`${region.name}`} subtitle={`${t("common.region")} · ${region.code}`} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KpiCard label={t("kpi.demand")} value={fmtHours(kpis.demand)} sub={t("unit.hours")} />
        <KpiCard label={t("kpi.capacity")} value={fmtHours(kpis.capacity)} sub={t("unit.hours")} />
        <KpiCard label={t("kpi.utilization")} value={fmtPct(kpis.utilization)} tone={kpis.utilization > 0.95 ? "bad" : kpis.utilization > 0.8 ? "warn" : "good"} />
        <KpiCard label={t("kpi.gap")} value={`${kpis.netGapFte > 0 ? "+" : ""}${fmtFte(kpis.netGapFte)}`} sub={t("unit.fte")} tone={kpis.netGapFte > 0 ? "bad" : "good"} />
        <KpiCard label={t("kpi.resources")} value={String(kpis.resources)} />
      </div>

      <Section title={t("heatmap.disciplineByMonth")} className="mb-5">
        <Heatmap data={heat} unit="fte" />
        <HeatmapLegend metric="gap" />
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <Section title={t("chart.staffingCurve")}>
          <StaffingArea data={staffing.data} series={staffing.series} />
        </Section>
        <Section title={t("chart.utilizationTrend")}>
          <UtilizationLine data={trend} />
        </Section>
      </div>

      <Section title={t("section.roster")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm">
          {roster.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b border-border/40 py-1.5">
              <Link href={`/resources/${r.id}`} className="hover:text-brand">{r.name}</Link>
              <span className="text-muted text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm" style={{ background: r.discipline.color }} />
                {r.discipline.code} · {r.grade}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
