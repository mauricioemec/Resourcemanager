import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, Section } from "@/components/ui/PageHeader";
import { FormDialog, DeleteButton, type Field } from "@/components/forms/FormDialog";
import { saveRegion, deleteRegion } from "@/actions/crud";
import { getRollup } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import { fmtHours, fmtPct } from "@/lib/format";
import { HOURS_PER_FTE_MONTH } from "@/lib/queries/facts";

export const dynamic = "force-dynamic";

const fields: Field[] = [
  { name: "code", label: "Code", required: true },
  { name: "name", label: "Name", required: true },
  { name: "country", label: "Country" },
];

export default async function RegionsPage() {
  const t = getT();
  const [regions, rollup] = await Promise.all([
    prisma.region.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { resources: true, projects: true } } },
    }),
    getRollup("region"),
  ]);
  const byId = new Map(rollup.map((r) => [r.key, r]));

  return (
    <>
      <PageHeader
        title={t("nav.regions")}
        action={<FormDialog title={t("nav.regions")} fields={fields} action={saveRegion} trigger="new" />}
      />
      <Section>
        <table className="text-sm">
          <thead>
            <tr className="text-muted text-left border-b border-border">
              <th className="py-2 font-medium">{t("table.code")}</th>
              <th className="py-2 font-medium">{t("table.name")}</th>
              <th className="py-2 font-medium text-right">{t("kpi.resources")}</th>
              <th className="py-2 font-medium text-right">{t("nav.projects")}</th>
              <th className="py-2 font-medium text-right">{t("metric.utilization")}</th>
              <th className="py-2 font-medium text-right">{t("metric.gap")} (FTE)</th>
              <th className="py-2 font-medium text-right">{t("table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {regions.map((r) => {
              const m = byId.get(r.id);
              const gapFte = m ? m.gap / HOURS_PER_FTE_MONTH : 0;
              return (
                <tr key={r.id} className="border-b border-border/50 hover:bg-surface-2/40">
                  <td className="py-2.5">
                    <Link href={`/regions/${r.id}`} className="text-brand hover:underline font-medium">
                      {r.code}
                    </Link>
                  </td>
                  <td className="py-2.5">{r.name}</td>
                  <td className="py-2.5 text-right">{r._count.resources}</td>
                  <td className="py-2.5 text-right">{r._count.projects}</td>
                  <td className={`py-2.5 text-right ${m && m.utilization > 0.95 ? "text-bad" : m && m.utilization > 0.8 ? "text-warn" : "text-good"}`}>
                    {m ? fmtPct(m.utilization) : "—"}
                  </td>
                  <td className={`py-2.5 text-right font-medium ${gapFte > 0 ? "text-bad" : "text-good"}`}>
                    {gapFte > 0 ? "+" : ""}
                    {gapFte.toFixed(1)}
                  </td>
                  <td className="py-2.5 text-right space-x-3">
                    <FormDialog
                      title={r.name}
                      fields={fields}
                      action={saveRegion}
                      values={{ id: r.id, code: r.code, name: r.name, country: r.country }}
                      trigger="edit"
                    />
                    <DeleteButton action={deleteRegion} id={r.id} />
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
