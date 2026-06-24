import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader, Section } from "@/components/ui/PageHeader";
import { KpiCard } from "@/components/kpi/KpiCard";
import { StaffingArea, MetricBar } from "@/components/charts/Charts";
import { getKpis, getStaffingCurve, getRollup } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import { fmtHours, fmtPct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProjectDetail({ params }: { params: { id: string } }) {
  const t = getT();
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { region: true },
  });
  if (!project) notFound();

  const filter = { projectId: project.id };
  const [kpis, staffing, byDisc, allocResources] = await Promise.all([
    getKpis(filter),
    getStaffingCurve(filter),
    getRollup("discipline", filter),
    prisma.allocation.findMany({
      where: { projectId: project.id },
      include: { resource: { include: { discipline: true } } },
      distinct: ["resourceId"],
      take: 60,
    }),
  ]);

  const discBars = byDisc
    .filter((d) => d.demand > 0 || d.allocated > 0)
    .map((d) => ({ label: d.label, demand: Math.round(d.demand), capacity: 0, allocated: Math.round(d.allocated) }));

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle={`${project.code} · ${project.region.name} · ${t(`status.${project.status}`)} · P${project.priority}`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label={t("kpi.demand")} value={fmtHours(kpis.demand)} sub={t("unit.hours")} />
        <KpiCard label={t("kpi.allocated")} value={fmtHours(kpis.allocated)} sub={t("unit.hours")} />
        <KpiCard label={t("kpi.fillRate")} value={fmtPct(kpis.fillRate)} tone={kpis.fillRate < 0.7 ? "bad" : kpis.fillRate < 0.9 ? "warn" : "good"} />
        <KpiCard
          label={`${t("table.start")} → ${t("table.end")}`}
          value={`${project.startDate.toISOString().slice(0, 7)}`}
          sub={`→ ${project.endDate.toISOString().slice(0, 7)}`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <Section title={t("chart.staffingCurve")}>
          <StaffingArea data={staffing.data} series={staffing.series} />
        </Section>
        <Section title={`${t("metric.demand")} vs ${t("metric.allocated")}`}>
          <MetricBar data={discBars} keys={["demand", "allocated"]} />
        </Section>
      </div>

      <Section title={t("section.assignedResources")}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1 text-sm">
          {allocResources.map((a) => (
            <div key={a.id} className="flex items-center justify-between border-b border-border/40 py-1.5">
              <Link href={`/resources/${a.resource.id}`} className="hover:text-brand">{a.resource.name}</Link>
              <span className="text-muted text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm" style={{ background: a.resource.discipline.color }} />
                {a.resource.discipline.code}
              </span>
            </div>
          ))}
          {allocResources.length === 0 && <div className="text-muted">{t("common.none")}</div>}
        </div>
      </Section>
    </>
  );
}
