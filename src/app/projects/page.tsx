import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, Section } from "@/components/ui/PageHeader";
import { FormDialog, DeleteButton, type Field } from "@/components/forms/FormDialog";
import { saveProject, deleteProject } from "@/actions/crud";
import { getT } from "@/lib/i18n/server";
import { IS_STATIC } from "@/lib/static";


const STATUS = ["PIPELINE", "ACTIVE", "ON_HOLD", "CLOSED"];

function statusTone(s: string) {
  return s === "ACTIVE"
    ? "bg-good/20 text-good"
    : s === "PIPELINE"
    ? "bg-brand/20 text-brand"
    : s === "ON_HOLD"
    ? "bg-warn/20 text-warn"
    : "bg-muted/20 text-muted";
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { region?: string; status?: string };
}) {
  const t = getT();
  // Static export has no request query string; ignore filters.
  const regionFilter = IS_STATIC ? undefined : searchParams.region;
  const statusFilter = IS_STATIC ? undefined : searchParams.status;
  const regions = await prisma.region.findMany({ orderBy: { name: "asc" } });
  const projects = await prisma.project.findMany({
    where: {
      regionId: regionFilter || undefined,
      status: statusFilter || undefined,
    },
    include: { region: true, _count: { select: { demands: true } } },
    orderBy: [{ priority: "asc" }, { name: "asc" }],
  });

  const fields: Field[] = [
    { name: "code", label: "Code", required: true },
    { name: "name", label: "Name", required: true },
    { name: "regionId", label: t("table.region"), type: "select", options: regions.map((r) => ({ value: r.id, label: r.name })) },
    { name: "status", label: t("table.status"), type: "select", options: STATUS.map((s) => ({ value: s, label: t(`status.${s}`) })) },
    { name: "priority", label: t("table.priority"), type: "number", step: "1" },
    { name: "clientName", label: t("table.client") },
    { name: "startDate", label: t("table.start"), type: "date" },
    { name: "endDate", label: t("table.end"), type: "date" },
  ];

  return (
    <>
      <PageHeader
        title={t("nav.projects")}
        action={IS_STATIC ? null : <FormDialog title={t("nav.projects")} fields={fields} action={saveProject} trigger="new" values={{ status: "ACTIVE", priority: 3 }} />}
      />

      {!IS_STATIC && (
        <div className="flex gap-2 mb-4 text-sm flex-wrap">
          <FilterLink label={t("common.all")} active={!regionFilter && !statusFilter} href="/projects" />
          {regions.map((r) => (
            <FilterLink key={r.id} label={r.code} active={regionFilter === r.id} href={`/projects?region=${r.id}`} />
          ))}
          <span className="w-px bg-border mx-1" />
          {STATUS.map((s) => (
            <FilterLink key={s} label={t(`status.${s}`)} active={statusFilter === s} href={`/projects?status=${s}`} />
          ))}
        </div>
      )}

      <Section>
        <table className="text-sm">
          <thead>
            <tr className="text-muted text-left border-b border-border">
              <th className="py-2 font-medium">{t("table.code")}</th>
              <th className="py-2 font-medium">{t("table.name")}</th>
              <th className="py-2 font-medium">{t("table.region")}</th>
              <th className="py-2 font-medium">{t("table.client")}</th>
              <th className="py-2 font-medium text-center">{t("table.priority")}</th>
              <th className="py-2 font-medium">{t("table.status")}</th>
              <th className="py-2 font-medium text-right">{t("table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-surface-2/40">
                <td className="py-2.5">
                  <Link href={`/projects/${p.id}`} className="text-brand hover:underline font-medium">{p.code}</Link>
                </td>
                <td className="py-2.5">{p.name}</td>
                <td className="py-2.5">{p.region.code}</td>
                <td className="py-2.5 text-muted">{p.clientName}</td>
                <td className="py-2.5 text-center">P{p.priority}</td>
                <td className="py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusTone(p.status)}`}>{t(`status.${p.status}`)}</span>
                </td>
                <td className="py-2.5 text-right space-x-3">
                  {!IS_STATIC && (
                    <>
                      <FormDialog
                        title={p.name}
                        fields={fields}
                        action={saveProject}
                        values={{
                          id: p.id,
                          code: p.code,
                          name: p.name,
                          regionId: p.regionId,
                          status: p.status,
                          priority: p.priority,
                          clientName: p.clientName,
                          startDate: p.startDate.toISOString().slice(0, 10),
                          endDate: p.endDate.toISOString().slice(0, 10),
                        }}
                        trigger="edit"
                      />
                      <DeleteButton action={deleteProject} id={p.id} />
                    </>
                  )}
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-muted">{t("common.none")}</td></tr>
            )}
          </tbody>
        </table>
      </Section>
    </>
  );
}

function FilterLink({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1 rounded-full text-xs font-medium ${active ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-text"}`}
    >
      {label}
    </Link>
  );
}
