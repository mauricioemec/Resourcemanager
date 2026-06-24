import { prisma } from "@/lib/db";

// Lightweight fact loader. The dataset is small (a few thousand rows), so we
// load the slices we need and aggregate in JS — portable and simple, no raw SQL.

export type Filter = {
  regionId?: string;
  disciplineId?: string;
  projectId?: string;
};

export type Facts = {
  regions: { id: string; code: string; name: string }[];
  disciplines: { id: string; code: string; name: string; color: string; sortOrder: number }[];
  projectRegion: Map<string, string>; // projectId -> regionId
  resourceRegion: Map<string, string>; // resourceId -> regionId
  // demand: regionId (project) x disciplineId x monthKey -> hours
  demand: FactRow[];
  capacity: FactRow[];
  allocation: FactRow[];
};

export type FactRow = {
  regionId: string;
  disciplineId: string;
  monthKey: number;
  hours: number;
};

export async function loadFacts(filter: Filter = {}): Promise<Facts> {
  const [regions, disciplines, projects, resources] = await Promise.all([
    prisma.region.findMany({ orderBy: { name: "asc" } }),
    prisma.discipline.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.project.findMany({ select: { id: true, regionId: true } }),
    prisma.resource.findMany({ select: { id: true, regionId: true } }),
  ]);

  const projectRegion = new Map(projects.map((p) => [p.id, p.regionId]));
  const resourceRegion = new Map(resources.map((r) => [r.id, r.regionId]));

  const [demandRows, capacityRows, allocationRows] = await Promise.all([
    prisma.demand.findMany({
      where: {
        disciplineId: filter.disciplineId,
        projectId: filter.projectId,
        ...(filter.regionId ? { project: { regionId: filter.regionId } } : {}),
      },
      select: { projectId: true, disciplineId: true, monthKey: true, hours: true },
    }),
    prisma.capacity.findMany({
      where: { regionId: filter.regionId, disciplineId: filter.disciplineId },
      select: { regionId: true, disciplineId: true, monthKey: true, availableHours: true },
    }),
    prisma.allocation.findMany({
      where: {
        disciplineId: filter.disciplineId,
        projectId: filter.projectId,
        ...(filter.regionId ? { project: { regionId: filter.regionId } } : {}),
      },
      select: { projectId: true, disciplineId: true, monthKey: true, allocatedHours: true },
    }),
  ]);

  const demand: FactRow[] = demandRows.map((d) => ({
    regionId: projectRegion.get(d.projectId)!,
    disciplineId: d.disciplineId,
    monthKey: d.monthKey,
    hours: d.hours,
  }));
  const capacity: FactRow[] = capacityRows.map((c) => ({
    regionId: c.regionId,
    disciplineId: c.disciplineId,
    monthKey: c.monthKey,
    hours: c.availableHours,
  }));
  const allocation: FactRow[] = allocationRows.map((a) => ({
    regionId: projectRegion.get(a.projectId)!,
    disciplineId: a.disciplineId,
    monthKey: a.monthKey,
    hours: a.allocatedHours,
  }));

  return { regions, disciplines, projectRegion, resourceRegion, demand, capacity, allocation };
}

// --- generic aggregation helpers ---

export function sumBy<T>(rows: T[], keyFn: (r: T) => string, valFn: (r: T) => number) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(keyFn(r), (m.get(keyFn(r)) ?? 0) + valFn(r));
  return m;
}

export const HOURS_PER_FTE_MONTH = 160;
