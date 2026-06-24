import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, Section } from "@/components/ui/PageHeader";
import { FormDialog, DeleteButton, type Field } from "@/components/forms/FormDialog";
import { saveResource, deleteResource } from "@/actions/crud";
import { getT } from "@/lib/i18n/server";
import { fmtPct } from "@/lib/format";
import { HORIZON_MONTHS } from "@/lib/months";

export const dynamic = "force-dynamic";

const GRADES = ["JUNIOR", "MID", "SENIOR", "PRINCIPAL", "LEAD"];

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: { region?: string; discipline?: string };
}) {
  const t = getT();
  const [regions, disciplines] = await Promise.all([
    prisma.region.findMany({ orderBy: { name: "asc" } }),
    prisma.discipline.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const resources = await prisma.resource.findMany({
    where: {
      regionId: searchParams.region || undefined,
      disciplineId: searchParams.discipline || undefined,
    },
    include: { region: true, discipline: true },
    orderBy: { name: "asc" },
    take: 200,
  });

  // per-resource utilization (allocated / horizon capacity)
  const allocAgg = await prisma.allocation.groupBy({
    by: ["resourceId"],
    _sum: { allocatedHours: true },
  });
  const allocById = new Map(allocAgg.map((a) => [a.resourceId, a._sum.allocatedHours ?? 0]));

  const fields: Field[] = [
    { name: "name", label: t("table.name"), required: true },
    { name: "email", label: "Email", required: true },
    { name: "disciplineId", label: t("table.discipline"), type: "select", options: disciplines.map((d) => ({ value: d.id, label: d.name })) },
    { name: "regionId", label: t("table.region"), type: "select", options: regions.map((r) => ({ value: r.id, label: r.name })) },
    { name: "grade", label: t("table.grade"), type: "select", options: GRADES.map((g) => ({ value: g, label: g })) },
    { name: "weeklyHours", label: "Weekly hours", type: "number", step: "1" },
    { name: "fteRatio", label: "FTE ratio", type: "number", step: "0.1" },
    { name: "costRate", label: "Cost rate", type: "number", step: "1" },
    { name: "active", label: "Active", type: "checkbox" },
  ];

  return (
    <>
      <PageHeader
        title={t("nav.resources")}
        subtitle={`${resources.length}`}
        action={<FormDialog title={t("nav.resources")} fields={fields} action={saveResource} trigger="new" values={{ grade: "MID", weeklyHours: 40, fteRatio: 1, active: true }} />}
      />

      <div className="flex gap-2 mb-4 text-sm flex-wrap">
        <FilterLink label={t("common.all")} active={!searchParams.region && !searchParams.discipline} href="/resources" />
        {regions.map((r) => (
          <FilterLink key={r.id} label={r.code} active={searchParams.region === r.id} href={`/resources?region=${r.id}`} />
        ))}
        <span className="w-px bg-border mx-1" />
        {disciplines.map((d) => (
          <FilterLink key={d.id} label={d.code} active={searchParams.discipline === d.id} href={`/resources?discipline=${d.id}`} />
        ))}
      </div>

      <Section>
        <table className="text-sm">
          <thead>
            <tr className="text-muted text-left border-b border-border">
              <th className="py-2 font-medium">{t("table.name")}</th>
              <th className="py-2 font-medium">{t("table.discipline")}</th>
              <th className="py-2 font-medium">{t("table.region")}</th>
              <th className="py-2 font-medium">{t("table.grade")}</th>
              <th className="py-2 font-medium text-right">{t("metric.utilization")}</th>
              <th className="py-2 font-medium text-right">{t("table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((r) => {
              const cap = r.fteRatio * 160 * HORIZON_MONTHS * 0.89;
              const util = cap > 0 ? (allocById.get(r.id) ?? 0) / cap : 0;
              return (
                <tr key={r.id} className="border-b border-border/50 hover:bg-surface-2/40">
                  <td className="py-2.5">
                    <Link href={`/resources/${r.id}`} className="text-brand hover:underline font-medium">{r.name}</Link>
                    {!r.active && <span className="ml-2 text-xs text-muted">(inactive)</span>}
                  </td>
                  <td className="py-2.5">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-sm" style={{ background: r.discipline.color }} />{r.discipline.code}</span>
                  </td>
                  <td className="py-2.5">{r.region.code}</td>
                  <td className="py-2.5 text-muted">{r.grade}</td>
                  <td className={`py-2.5 text-right ${util > 1 ? "text-bad" : util > 0.85 ? "text-warn" : "text-good"}`}>{fmtPct(util)}</td>
                  <td className="py-2.5 text-right space-x-3">
                    <FormDialog
                      title={r.name}
                      fields={fields}
                      action={saveResource}
                      values={{ id: r.id, name: r.name, email: r.email, disciplineId: r.disciplineId, regionId: r.regionId, grade: r.grade, weeklyHours: r.weeklyHours, fteRatio: r.fteRatio, costRate: r.costRate, active: r.active }}
                      trigger="edit"
                    />
                    <DeleteButton action={deleteResource} id={r.id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>
    </>
  );
}

function FilterLink({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link href={href} className={`px-3 py-1 rounded-full text-xs font-medium ${active ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-text"}`}>
      {label}
    </Link>
  );
}
