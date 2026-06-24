import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader, Section } from "@/components/ui/PageHeader";
import { KpiCard } from "@/components/kpi/KpiCard";
import { UtilizationLine } from "@/components/charts/Charts";
import { getT } from "@/lib/i18n/server";
import { fmtPct, fmtHours } from "@/lib/format";
import { horizonKeys } from "@/lib/months";

export const dynamic = "force-dynamic";

export default async function ResourceDetail({ params }: { params: { id: string } }) {
  const t = getT();
  const resource = await prisma.resource.findUnique({
    where: { id: params.id },
    include: { region: true, discipline: true },
  });
  if (!resource) notFound();

  const allocations = await prisma.allocation.findMany({
    where: { resourceId: resource.id },
    include: { project: true },
    orderBy: { monthKey: "asc" },
  });

  const monthlyCap = resource.fteRatio * 160;
  const byMonth = new Map<number, number>();
  const byProject = new Map<string, { name: string; id: string; hours: number }>();
  for (const a of allocations) {
    byMonth.set(a.monthKey, (byMonth.get(a.monthKey) ?? 0) + a.allocatedHours);
    const p = byProject.get(a.projectId) ?? { name: a.project.name, id: a.projectId, hours: 0 };
    p.hours += a.allocatedHours;
    byProject.set(a.projectId, p);
  }

  const trend = horizonKeys().map((mk) => {
    const m = (mk % 100) - 1;
    const lbl = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m];
    return {
      label: `${lbl} ${String(Math.floor(mk / 100)).slice(2)}`,
      utilization: monthlyCap > 0 ? (byMonth.get(mk) ?? 0) / monthlyCap : 0,
    };
  });
  const totalAlloc = allocations.reduce((s, a) => s + a.allocatedHours, 0);
  const horizonCap = monthlyCap * horizonKeys().length * 0.89;
  const projects = [...byProject.values()].sort((a, b) => b.hours - a.hours);

  return (
    <>
      <PageHeader
        title={resource.name}
        subtitle={`${resource.discipline.name} · ${resource.region.name} · ${resource.grade}`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="FTE" value={resource.fteRatio.toFixed(1)} />
        <KpiCard label={t("kpi.allocated")} value={fmtHours(totalAlloc)} sub={t("unit.hours")} />
        <KpiCard label={t("metric.utilization")} value={fmtPct(horizonCap > 0 ? totalAlloc / horizonCap : 0)} tone={totalAlloc / horizonCap > 1 ? "bad" : totalAlloc / horizonCap > 0.85 ? "warn" : "good"} />
        <KpiCard label={t("nav.projects")} value={String(projects.length)} />
      </div>

      <Section title={`${t("metric.utilization")} (${t("unit.fte")})`} className="mb-5">
        <UtilizationLine data={trend} />
        <p className="text-xs text-muted mt-2">{t("alloc.over")}: &gt; 100%</p>
      </Section>

      <Section title={t("nav.projects")}>
        <table className="text-sm">
          <thead>
            <tr className="text-muted text-left border-b border-border">
              <th className="py-2 font-medium">{t("table.project")}</th>
              <th className="py-2 font-medium text-right">{t("unit.hours")}</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-border/50">
                <td className="py-2"><Link href={`/projects/${p.id}`} className="hover:text-brand">{p.name}</Link></td>
                <td className="py-2 text-right">{fmtHours(p.hours)}</td>
              </tr>
            ))}
            {projects.length === 0 && <tr><td colSpan={2} className="py-4 text-muted">{t("common.none")}</td></tr>}
          </tbody>
        </table>
      </Section>
    </>
  );
}
