import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader, Section } from "@/components/ui/PageHeader";
import { KpiCard } from "@/components/kpi/KpiCard";
import { Heatmap, HeatmapLegend } from "@/components/charts/Heatmap";
import { MetricBar, UtilizationLine } from "@/components/charts/Charts";
import { getKpis, getHeatmap, getTrend, getRollup } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import { fmtHours, fmtFte, fmtPct } from "@/lib/format";


export const dynamicParams = process.env.STATIC !== "1";
export async function generateStaticParams() {
  const rows = await prisma.discipline.findMany({ select: { id: true } });
  return rows.map((r) => ({ id: r.id }));
}

export default async function DisciplineDetail({ params }: { params: { id: string } }) {
  const t = getT();
  const discipline = await prisma.discipline.findUnique({ where: { id: params.id } });
  if (!discipline) notFound();

  const filter = { disciplineId: discipline.id };
  const [kpis, heat, trend, byRegion, resources] = await Promise.all([
    getKpis(filter),
    getHeatmap("region", "month", "gap", filter),
    getTrend(filter),
    getRollup("region", filter),
    prisma.resource.findMany({
      where: { disciplineId: discipline.id, active: true },
      include: { region: true },
      orderBy: { name: "asc" },
      take: 40,
    }),
  ]);

  const regionBars = byRegion.map((r) => ({
    label: r.label,
    demand: Math.round(r.demand),
    capacity: Math.round(r.capacity),
    allocated: Math.round(r.allocated),
  }));

  return (
    <>
      <PageHeader
        title={discipline.name}
        subtitle={`${t("common.discipline")} · ${discipline.code}`}
        action={<span className="w-5 h-5 rounded" style={{ background: discipline.color }} />}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KpiCard label={t("kpi.demand")} value={fmtHours(kpis.demand)} sub={t("unit.hours")} />
        <KpiCard label={t("kpi.capacity")} value={fmtHours(kpis.capacity)} sub={t("unit.hours")} />
        <KpiCard label={t("kpi.utilization")} value={fmtPct(kpis.utilization)} tone={kpis.utilization > 0.95 ? "bad" : kpis.utilization > 0.8 ? "warn" : "good"} />
        <KpiCard label={t("kpi.gap")} value={`${kpis.netGapFte > 0 ? "+" : ""}${fmtFte(kpis.netGapFte)}`} sub={t("unit.fte")} tone={kpis.netGapFte > 0 ? "bad" : "good"} />
        <KpiCard label={t("kpi.resources")} value={String(kpis.resources)} />
      </div>

      <Section title={t("heatmap.regionByMonth")} className="mb-5">
        <Heatmap data={heat} unit="fte" />
        <HeatmapLegend metric="gap" />
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <Section title={t("chart.byRegion")}>
          <MetricBar data={regionBars} />
        </Section>
        <Section title={t("chart.utilizationTrend")}>
          <UtilizationLine data={trend} />
        </Section>
      </div>

      <Section title={t("section.relatedResources")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm">
          {resources.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b border-border/40 py-1.5">
              <Link href={`/resources/${r.id}`} className="hover:text-brand">{r.name}</Link>
              <span className="text-muted text-xs">{r.region.code} · {r.grade}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
