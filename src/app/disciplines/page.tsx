import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, Section } from "@/components/ui/PageHeader";
import { FormDialog, DeleteButton, type Field } from "@/components/forms/FormDialog";
import { saveDiscipline, deleteDiscipline } from "@/actions/crud";
import { getRollup } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import { fmtHours, fmtPct } from "@/lib/format";
import { HOURS_PER_FTE_MONTH } from "@/lib/queries/facts";
import { IS_STATIC } from "@/lib/static";


const fields: Field[] = [
  { name: "code", label: "Code", required: true },
  { name: "name", label: "Name", required: true },
  { name: "color", label: "Color", type: "color" },
  { name: "sortOrder", label: "Sort order", type: "number" },
];

export default async function DisciplinesPage() {
  const t = getT();
  const [disciplines, rollup] = await Promise.all([
    prisma.discipline.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { resources: true } } },
    }),
    getRollup("discipline"),
  ]);
  const byId = new Map(rollup.map((r) => [r.key, r]));

  return (
    <>
      <PageHeader
        title={t("nav.disciplines")}
        action={IS_STATIC ? null : <FormDialog title={t("nav.disciplines")} fields={fields} action={saveDiscipline} trigger="new" values={{ color: "#5b8def" }} />}
      />
      <Section>
        <table className="text-sm">
          <thead>
            <tr className="text-muted text-left border-b border-border">
              <th className="py-2 font-medium">{t("table.code")}</th>
              <th className="py-2 font-medium">{t("table.name")}</th>
              <th className="py-2 font-medium text-right">{t("kpi.resources")}</th>
              <th className="py-2 font-medium text-right">{t("metric.demand")}</th>
              <th className="py-2 font-medium text-right">{t("metric.utilization")}</th>
              <th className="py-2 font-medium text-right">{t("metric.gap")} (FTE)</th>
              <th className="py-2 font-medium text-right">{t("table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {disciplines.map((d) => {
              const m = byId.get(d.id);
              const gapFte = m ? m.gap / HOURS_PER_FTE_MONTH : 0;
              return (
                <tr key={d.id} className="border-b border-border/50 hover:bg-surface-2/40">
                  <td className="py-2.5">
                    <Link href={`/disciplines/${d.id}`} className="flex items-center gap-2 font-medium text-brand hover:underline">
                      <span className="w-3 h-3 rounded-sm" style={{ background: d.color }} />
                      {d.code}
                    </Link>
                  </td>
                  <td className="py-2.5">{d.name}</td>
                  <td className="py-2.5 text-right">{d._count.resources}</td>
                  <td className="py-2.5 text-right">{m ? fmtHours(m.demand) : "—"}</td>
                  <td className={`py-2.5 text-right ${m && m.utilization > 0.95 ? "text-bad" : m && m.utilization > 0.8 ? "text-warn" : "text-good"}`}>
                    {m ? fmtPct(m.utilization) : "—"}
                  </td>
                  <td className={`py-2.5 text-right font-medium ${gapFte > 0 ? "text-bad" : "text-good"}`}>
                    {gapFte > 0 ? "+" : ""}
                    {gapFte.toFixed(1)}
                  </td>
                  <td className="py-2.5 text-right space-x-3">
                    {!IS_STATIC && (
                      <>
                        <FormDialog
                          title={d.name}
                          fields={fields}
                          action={saveDiscipline}
                          values={{ id: d.id, code: d.code, name: d.name, color: d.color, sortOrder: d.sortOrder }}
                          trigger="edit"
                        />
                        <DeleteButton action={deleteDiscipline} id={d.id} />
                      </>
                    )}
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
