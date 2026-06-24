import { loadFacts, sumBy, HOURS_PER_FTE_MONTH, type Filter, type FactRow } from "./facts";
import { horizonKeys } from "@/lib/months";
import { prisma } from "@/lib/db";

export type MetricRow = {
  key: string;
  label: string;
  demand: number;
  capacity: number;
  allocated: number;
  gap: number; // demand - capacity
  utilization: number; // allocated / capacity
  fillRate: number; // allocated / demand
  color?: string;
};

export type Kpis = {
  demand: number;
  capacity: number;
  allocated: number;
  utilization: number;
  fillRate: number;
  netGapFte: number;
  projects: number;
  resources: number;
};

function ratio(num: number, den: number) {
  return den > 0 ? num / den : 0;
}

/** Headline KPIs for a scope (optionally filtered). */
export async function getKpis(filter: Filter = {}): Promise<Kpis> {
  const f = await loadFacts(filter);
  const demand = f.demand.reduce((s, r) => s + r.hours, 0);
  const capacity = f.capacity.reduce((s, r) => s + r.hours, 0);
  const allocated = f.allocation.reduce((s, r) => s + r.hours, 0);
  const [projects, resources] = await Promise.all([
    prisma.project.count({
      where: { status: "ACTIVE", ...(filter.regionId ? { regionId: filter.regionId } : {}) },
    }),
    prisma.resource.count({
      where: {
        active: true,
        ...(filter.regionId ? { regionId: filter.regionId } : {}),
        ...(filter.disciplineId ? { disciplineId: filter.disciplineId } : {}),
      },
    }),
  ]);
  return {
    demand,
    capacity,
    allocated,
    utilization: ratio(allocated, capacity),
    fillRate: ratio(allocated, demand),
    netGapFte: (demand - capacity) / HOURS_PER_FTE_MONTH,
    projects,
    resources,
  };
}

/** Rollup grouped by a dimension. */
export async function getRollup(
  groupBy: "region" | "discipline" | "month",
  filter: Filter = {}
): Promise<MetricRow[]> {
  const f = await loadFacts(filter);

  if (groupBy === "discipline") {
    return f.disciplines
      .map((d) => buildRow(d.id, d.name, f.demand, f.capacity, f.allocation, (r) => r.disciplineId, d.color))
      .filter((r) => r.demand > 0 || r.capacity > 0);
  }
  if (groupBy === "region") {
    return f.regions.map((rg) =>
      buildRow(rg.id, rg.name, f.demand, f.capacity, f.allocation, (r) => r.regionId)
    );
  }
  // month
  return horizonKeys().map((mk) =>
    buildRow(String(mk), String(mk), f.demand, f.capacity, f.allocation, (r) => String(r.monthKey))
  );
}

function buildRow(
  key: string,
  label: string,
  demand: FactRow[],
  capacity: FactRow[],
  allocation: FactRow[],
  keyFn: (r: FactRow) => string,
  color?: string
): MetricRow {
  const d = demand.filter((r) => keyFn(r) === key).reduce((s, r) => s + r.hours, 0);
  const c = capacity.filter((r) => keyFn(r) === key).reduce((s, r) => s + r.hours, 0);
  const a = allocation.filter((r) => keyFn(r) === key).reduce((s, r) => s + r.hours, 0);
  return {
    key,
    label,
    demand: d,
    capacity: c,
    allocated: a,
    gap: d - c,
    utilization: ratio(a, c),
    fillRate: ratio(a, d),
    color,
  };
}

export type Heatmap = {
  rowKeys: { key: string; label: string; color?: string }[];
  colKeys: { key: string; label: string }[];
  cells: number[][]; // metric value per [row][col]
  metric: "gap" | "utilization" | "demand";
};

/** Build a matrix for the heatmap component. */
export async function getHeatmap(
  rows: "region" | "discipline",
  cols: "discipline" | "month",
  metric: "gap" | "utilization" | "demand",
  filter: Filter = {}
): Promise<Heatmap> {
  const f = await loadFacts(filter);
  const { horizonKeys: hk } = await import("@/lib/months");

  const rowDefs =
    rows === "region"
      ? f.regions.map((r) => ({ key: r.id, label: r.code }))
      : f.disciplines.map((d) => ({ key: d.id, label: d.code, color: d.color }));

  const colDefs =
    cols === "discipline"
      ? f.disciplines.map((d) => ({ key: d.id, label: d.code }))
      : hk().map((mk) => ({ key: String(mk), label: monthShort(mk) }));

  const rowKeyFn = rows === "region" ? (r: FactRow) => r.regionId : (r: FactRow) => r.disciplineId;
  const colKeyFn =
    cols === "discipline" ? (r: FactRow) => r.disciplineId : (r: FactRow) => String(r.monthKey);

  const dem = index(f.demand, rowKeyFn, colKeyFn);
  const cap = index(f.capacity, rowKeyFn, colKeyFn);
  const alloc = index(f.allocation, rowKeyFn, colKeyFn);

  const cells = rowDefs.map((rd) =>
    colDefs.map((cd) => {
      const k = `${rd.key}|${cd.key}`;
      const d = dem.get(k) ?? 0;
      const c = cap.get(k) ?? 0;
      const a = alloc.get(k) ?? 0;
      if (metric === "gap") return d - c;
      if (metric === "utilization") return ratio(a, c);
      return d;
    })
  );

  return { rowKeys: rowDefs, colKeys: colDefs, cells, metric };
}

function index(rows: FactRow[], rowKeyFn: (r: FactRow) => string, colKeyFn: (r: FactRow) => string) {
  return sumBy(
    rows,
    (r) => `${rowKeyFn(r)}|${colKeyFn(r)}`,
    (r) => r.hours
  );
}

function monthShort(mk: number) {
  const m = (mk % 100) - 1;
  const lbl = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${lbl[m]} ${String(Math.floor(mk / 100)).slice(2)}`;
}

export type TrendPoint = {
  monthKey: number;
  label: string;
  demand: number;
  capacity: number;
  allocated: number;
  utilization: number;
};

/** Monthly trend series (demand/capacity/allocated + utilization). */
export async function getTrend(filter: Filter = {}): Promise<TrendPoint[]> {
  const f = await loadFacts(filter);
  const dem = sumBy(f.demand, (r) => String(r.monthKey), (r) => r.hours);
  const cap = sumBy(f.capacity, (r) => String(r.monthKey), (r) => r.hours);
  const alloc = sumBy(f.allocation, (r) => String(r.monthKey), (r) => r.hours);
  return horizonKeys().map((mk) => {
    const c = cap.get(String(mk)) ?? 0;
    const a = alloc.get(String(mk)) ?? 0;
    return {
      monthKey: mk,
      label: monthShort(mk),
      demand: Math.round(dem.get(String(mk)) ?? 0),
      capacity: Math.round(c),
      allocated: Math.round(a),
      utilization: ratio(a, c),
    };
  });
}

/** Staffing curve: allocated FTE per month, stacked by discipline. */
export async function getStaffingCurve(filter: Filter = {}) {
  const f = await loadFacts(filter);
  const months = horizonKeys();
  const series = f.disciplines.map((d) => ({ code: d.code, name: d.name, color: d.color }));
  const byKey = sumBy(
    f.allocation,
    (r) => `${r.monthKey}|${r.disciplineId}`,
    (r) => r.hours
  );
  const discById = new Map(f.disciplines.map((d) => [d.id, d.code]));
  const data = months.map((mk) => {
    const point: Record<string, number | string> = { label: monthShort(mk) };
    for (const d of f.disciplines) {
      const k = `${mk}|${d.id}`;
      point[d.code] = +((byKey.get(k) ?? 0) / HOURS_PER_FTE_MONTH).toFixed(2);
    }
    return point;
  });
  return { series, data, discById };
}
