import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, Section } from "@/components/ui/PageHeader";
import { DemandGrid } from "@/components/forms/DemandGrid";
import { getT } from "@/lib/i18n/server";
import { horizonKeys } from "@/lib/months";

export const dynamic = "force-dynamic";

export default async function AllocationsPage({
  searchParams,
}: {
  searchParams: { project?: string };
}) {
  const t = getT();
  const projects = await prisma.project.findMany({
    where: { status: { in: ["ACTIVE", "PIPELINE", "ON_HOLD"] } },
    orderBy: [{ priority: "asc" }, { name: "asc" }],
    include: { region: true },
  });
  const selectedId = searchParams.project || projects[0]?.id;
  const project = projects.find((p) => p.id === selectedId) ?? projects[0];

  const disciplines = await prisma.discipline.findMany({ orderBy: { sortOrder: "asc" } });
  const months = horizonKeys().map((mk) => {
    const m = (mk % 100) - 1;
    const lbl = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m];
    return { key: mk, label: `${lbl}${String(Math.floor(mk / 100)).slice(2)}` };
  });

  const initial: Record<string, number> = {};
  if (project) {
    const demand = await prisma.demand.findMany({ where: { projectId: project.id } });
    for (const d of demand) initial[`${d.disciplineId}|${d.monthKey}`] = Math.round(d.hours);
  }

  return (
    <>
      <PageHeader title={t("nav.allocations")} subtitle={t("alloc.modeDemand")} />

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <span className="text-xs text-muted">{t("table.project")}:</span>
        <select
          // server component: use a form GET to switch project
          className="hidden"
        />
        <div className="flex gap-1.5 flex-wrap">
          {projects.slice(0, 20).map((p) => (
            <Link
              key={p.id}
              href={`/allocations?project=${p.id}`}
              className={`px-2.5 py-1 rounded-md text-xs font-medium ${p.id === project?.id ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-text"}`}
            >
              {p.code}
            </Link>
          ))}
        </div>
      </div>

      {project ? (
        <Section title={`${project.code} — ${project.name} · ${project.region.code}`}>
          <DemandGrid
            projectId={project.id}
            disciplines={disciplines.map((d) => ({ id: d.id, code: d.code, color: d.color }))}
            months={months}
            initial={initial}
          />
        </Section>
      ) : (
        <Section>{t("common.none")}</Section>
      )}
    </>
  );
}
