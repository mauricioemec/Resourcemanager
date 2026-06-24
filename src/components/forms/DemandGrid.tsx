"use client";

import { useState, useTransition } from "react";
import { useT } from "@/lib/i18n/provider";
import { upsertDemand } from "@/actions/demand";
import { IS_STATIC } from "@/lib/static";

type Cell = { disciplineId: string; monthKey: number; hours: number };

export function DemandGrid({
  projectId,
  disciplines,
  months,
  initial,
}: {
  projectId: string;
  disciplines: { id: string; code: string; color: string }[];
  months: { key: number; label: string }[];
  initial: Record<string, number>; // `${disciplineId}|${monthKey}` -> hours
}) {
  const t = useT();
  const [cells, setCells] = useState<Record<string, number>>(initial);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function set(disciplineId: string, monthKey: number, value: string) {
    const v = value === "" ? 0 : Math.max(0, Math.round(Number(value)));
    setCells((c) => ({ ...c, [`${disciplineId}|${monthKey}`]: v }));
    setSaved(false);
  }

  function save() {
    const payload: Cell[] = [];
    for (const d of disciplines)
      for (const m of months)
        payload.push({ disciplineId: d.id, monthKey: m.key, hours: cells[`${d.id}|${m.key}`] ?? 0 });
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("payload", JSON.stringify(payload));
    start(async () => {
      await upsertDemand(fd);
      setSaved(true);
    });
  }

  const rowTotal = (dId: string) =>
    months.reduce((s, m) => s + (cells[`${dId}|${m.key}`] ?? 0), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs text-muted">{t("alloc.modeDemand")} — {t("unit.hours")}</p>
        {IS_STATIC ? (
          <span className="text-xs text-muted italic">demo · read-only / somente leitura</span>
        ) : (
          <button
            onClick={save}
            disabled={pending}
            className="bg-brand hover:bg-brand/80 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg"
          >
            {pending ? t("common.loading") : saved ? "✓ " + t("action.save") : t("action.save")}
          </button>
        )}
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="text-xs border-separate" style={{ borderSpacing: 2 }}>
          <thead>
            <tr>
              <th className="sticky left-0 bg-surface text-left text-muted font-medium pr-2 min-w-[100px]">{t("table.discipline")}</th>
              {months.map((m) => (
                <th key={m.key} className="text-muted font-medium text-center min-w-[44px]">{m.label}</th>
              ))}
              <th className="text-muted font-medium text-right pl-2">Σ</th>
            </tr>
          </thead>
          <tbody>
            {disciplines.map((d) => (
              <tr key={d.id}>
                <td className="sticky left-0 bg-surface pr-2">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: d.color }} />{d.code}</span>
                </td>
                {months.map((m) => {
                  const v = cells[`${d.id}|${m.key}`] ?? 0;
                  return (
                    <td key={m.key}>
                      <input
                        type="number"
                        min={0}
                        value={v || ""}
                        readOnly={IS_STATIC}
                        onChange={(e) => set(d.id, m.key, e.target.value)}
                        className={`w-11 text-center rounded py-1 border ${v > 0 ? "bg-surface-2 border-border text-text" : "bg-transparent border-border/40 text-muted"}`}
                      />
                    </td>
                  );
                })}
                <td className="text-right pl-2 font-medium text-muted">{Math.round(rowTotal(d.id))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
