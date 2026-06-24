import { PrismaClient } from "@prisma/client";
import { Rng } from "./seed/rng";
import {
  RNG_SEED,
  REGIONS,
  DISCIPLINES,
  GRADES,
  ARCHETYPES,
  PROJECT_COUNT,
  RESOURCE_COUNT,
  DISCIPLINE_HEADCOUNT_WEIGHT,
  REGION_WEIGHT,
} from "./seed/config";

const prisma = new PrismaClient();

// ---- Local month helpers (self-contained; mirrors src/lib/months.ts) ----
const HORIZON_START_KEY = 202601;
const HORIZON_MONTHS = 24;
const HOURS_PER_FTE_MONTH = 160;

function addMonths(key: number, n: number): number {
  const year = Math.floor(key / 100);
  const month = key % 100;
  const idx = year * 12 + (month - 1) + n;
  return Math.floor(idx / 12) * 100 + ((idx % 12) + 1);
}
function dateFromKey(key: number): Date {
  return new Date(Date.UTC(Math.floor(key / 100), (key % 100) - 1, 1));
}
const HORIZON: number[] = Array.from({ length: HORIZON_MONTHS }, (_, i) =>
  addMonths(HORIZON_START_KEY, i)
);
function keyIndex(key: number): number {
  return HORIZON.indexOf(key);
}

// Company-wide utilization targets per discipline → engineer believable
// red (shortage) and green (surplus) cells in the heatmaps, deterministically.
const TARGET_UTIL: Record<string, number> = {
  MEC: 1.18,
  PIP: 1.15,
  PRO: 1.12,
  INC: 1.05,
  ELE: 1.0,
  CIV: 0.95,
  STR: 0.92,
  PCT: 0.85,
  GEO: 0.72,
  ENV: 0.68,
};

// Seasonal leave factor by calendar month (more leave mid-year & December).
const LEAVE_BY_MONTH = [
  0.08, 0.08, 0.1, 0.1, 0.11, 0.14, 0.16, 0.15, 0.1, 0.09, 0.09, 0.15,
];

async function main() {
  const rng = new Rng(RNG_SEED);

  console.log("Clearing existing data…");
  await prisma.allocation.deleteMany();
  await prisma.demand.deleteMany();
  await prisma.capacity.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.project.deleteMany();
  await prisma.discipline.deleteMany();
  await prisma.region.deleteMany();

  // ---- Regions ----
  console.log("Seeding regions & disciplines…");
  const regions = await Promise.all(
    REGIONS.map((r) =>
      prisma.region.create({ data: { code: r.code, name: r.name, country: r.country } })
    )
  );
  const regionByCode = Object.fromEntries(regions.map((r) => [r.code, r]));

  // ---- Disciplines ----
  const disciplines = await Promise.all(
    DISCIPLINES.map((d) =>
      prisma.discipline.create({
        data: { code: d.code, name: d.name, color: d.color, sortOrder: d.sortOrder },
      })
    )
  );
  const discByCode = Object.fromEntries(disciplines.map((d) => [d.code, d]));

  // ---- Resources ----
  console.log("Seeding resources…");
  const FIRST = ["Ana", "Bruno", "Carla", "Diego", "Elena", "Felipe", "Gabriela", "Hugo", "Isabela", "João", "Karen", "Lucas", "Marina", "Nuno", "Olivia", "Pedro", "Rafaela", "Sofia", "Tiago", "Vera", "Wei", "Ximena", "Yara", "Zara", "Liam", "Noah", "Emma", "Oliver", "Amir", "Fatima", "Chen", "Priya", "Sven", "Ingrid"];
  const LAST = ["Silva", "Santos", "Oliveira", "Souza", "Costa", "Pereira", "Almeida", "Nascimento", "Lima", "Araujo", "Smith", "Johnson", "Williams", "Brown", "Müller", "Schmidt", "Rossi", "Khan", "Tanaka", "Kim", "Nguyen", "Patel", "Andersson", "Dubois"];

  const regionPick = REGIONS.map((r) => ({ value: r.code, weight: REGION_WEIGHT[r.code] }));
  const discPick = DISCIPLINES.map((d) => ({
    value: d.code,
    weight: DISCIPLINE_HEADCOUNT_WEIGHT[d.code],
  }));

  const resourceData: any[] = [];
  for (let i = 0; i < RESOURCE_COUNT; i++) {
    const regionCode = rng.weighted(regionPick);
    const discCode = rng.weighted(discPick);
    const grade = rng.weighted(GRADES.map((g) => ({ value: g.value, weight: g.weight })));
    const fteRatio = rng.bool(0.12) ? rng.pick([0.6, 0.8]) : 1.0;
    const first = rng.pick(FIRST);
    const last = rng.pick(LAST);
    resourceData.push({
      name: `${first} ${last}`,
      email: `${first}.${last}.${i}`.toLowerCase().replace(/[^a-z0-9.]/g, "") + "@eng.example.com",
      disciplineId: discByCode[discCode].id,
      regionId: regionByCode[regionCode].id,
      grade,
      weeklyHours: 40,
      fteRatio,
      costRate: rng.int(60, 220),
      active: rng.bool(0.96),
    });
  }
  await prisma.resource.createMany({ data: resourceData });
  const resources = await prisma.resource.findMany();

  // ---- Capacity (derived from active roster, with seasonal leave) ----
  console.log("Seeding capacity…");
  // base headcount (FTE) by region×discipline
  const baseHeadcount = new Map<string, number>(); // key regionId|discId
  for (const r of resources) {
    if (!r.active) continue;
    const k = `${r.regionId}|${r.disciplineId}`;
    baseHeadcount.set(k, (baseHeadcount.get(k) ?? 0) + r.fteRatio);
  }
  const capacityData: any[] = [];
  // capacity[regionId|discId|monthKey] = availableHours  (for allocator + scaling)
  const capMap = new Map<string, number>();
  for (const region of regions) {
    for (const disc of disciplines) {
      const k = `${region.id}|${disc.id}`;
      const hc = baseHeadcount.get(k) ?? 0;
      if (hc === 0) continue;
      for (const monthKey of HORIZON) {
        const leave = LEAVE_BY_MONTH[(monthKey % 100) - 1];
        const availableHours = hc * HOURS_PER_FTE_MONTH * (1 - leave);
        capacityData.push({
          regionId: region.id,
          disciplineId: disc.id,
          month: dateFromKey(monthKey),
          monthKey,
          availableHours,
          headcount: hc,
        });
        capMap.set(`${region.id}|${disc.id}|${monthKey}`, availableHours);
      }
    }
  }
  await prisma.capacity.createMany({ data: capacityData });

  // ---- Projects ----
  console.log("Seeding projects…");
  const statusPick = [
    { value: "ACTIVE", weight: 60 },
    { value: "PIPELINE", weight: 20 },
    { value: "ON_HOLD", weight: 8 },
    { value: "CLOSED", weight: 12 },
  ];
  const sizePick = [
    { value: 2.0, weight: 40 }, // small peak FTE per strong discipline
    { value: 4.0, weight: 40 },
    { value: 7.5, weight: 20 }, // large
  ];
  const projects: any[] = [];
  for (let i = 0; i < PROJECT_COUNT; i++) {
    const regionCode = rng.weighted(regionPick);
    const archetype = ARCHETYPES[rng.int(0, ARCHETYPES.length - 1)];
    const status = rng.weighted(statusPick);
    const duration = rng.int(6, 22);
    const startIdx = rng.int(0, HORIZON_MONTHS - 4);
    const endIdx = Math.min(HORIZON_MONTHS - 1, startIdx + duration);
    const startKey = HORIZON[startIdx];
    const endKey = HORIZON[endIdx];
    const sizeFactor = rng.weighted(sizePick);
    const created = await prisma.project.create({
      data: {
        code: `PRJ-${String(1000 + i)}`,
        name: `${archetype.name} ${rng.pick(["Phase", "Program", "Project", "Expansion", "Upgrade"])} ${rng.pick(["Alpha", "Beta", "Delta", "Orion", "Atlas", "Vega", "Nova", "Titan"])}`,
        regionId: regionByCode[regionCode].id,
        status,
        priority: rng.weighted([
          { value: 1, weight: 12 },
          { value: 2, weight: 23 },
          { value: 3, weight: 35 },
          { value: 4, weight: 20 },
          { value: 5, weight: 10 },
        ]),
        clientName: rng.pick(["Petro Global", "Hydro Corp", "Northwind Energy", "Civitas", "Mareterra", "Helios Power", "Vortex Mining", "AquaWorks"]),
        startDate: dateFromKey(startKey),
        endDate: dateFromKey(endKey),
        budgetHours: null,
      },
    });
    projects.push({
      ...created,
      _archetype: archetype,
      _startIdx: startIdx,
      _endIdx: endIdx,
      _sizeFactor: sizeFactor,
      _regionId: regionByCode[regionCode].id,
    });
  }

  // ---- Demand (staffing curves), then scale per discipline to hit targets ----
  console.log("Seeding demand…");
  type DemandRow = {
    projectId: string;
    disciplineId: string;
    regionId: string;
    monthKey: number;
    fte: number;
  };
  const rawDemand: DemandRow[] = [];
  for (const p of projects) {
    if (p.status === "CLOSED") continue; // closed projects no longer demand
    const span = p._endIdx - p._startIdx; // inclusive handled below
    const n = span + 1;
    const priorityBoost = 1 + (3 - p.priority) * 0.08; // higher priority → a bit more
    for (const [discCode, weight] of Object.entries(p._archetype.mix)) {
      const peak = p._sizeFactor * (weight as number) * priorityBoost;
      for (let j = 0; j <= span; j++) {
        const t = n === 1 ? 1 : j / (n - 1);
        let factor: number;
        if (t < 0.25) factor = t / 0.25;
        else if (t > 0.75) factor = (1 - t) / 0.25;
        else factor = 1;
        const jitter = rng.float(0.9, 1.1);
        const fte = peak * factor * jitter;
        if (fte <= 0.05) continue;
        rawDemand.push({
          projectId: p.id,
          disciplineId: discByCode[discCode].id,
          regionId: p._regionId,
          monthKey: HORIZON[p._startIdx + j],
          fte,
        });
      }
    }
  }

  // sum raw demand & capacity per discipline (over horizon) → scale factor
  const demandByDisc = new Map<string, number>();
  for (const d of rawDemand)
    demandByDisc.set(d.disciplineId, (demandByDisc.get(d.disciplineId) ?? 0) + d.fte * HOURS_PER_FTE_MONTH);
  const capByDisc = new Map<string, number>();
  for (const [k, hours] of capMap) {
    const discId = k.split("|")[1];
    capByDisc.set(discId, (capByDisc.get(discId) ?? 0) + hours);
  }
  const scaleByDisc = new Map<string, number>();
  for (const disc of disciplines) {
    const target = TARGET_UTIL[disc.code] ?? 0.9;
    const dem = demandByDisc.get(disc.id) ?? 0;
    const cap = capByDisc.get(disc.id) ?? 0;
    scaleByDisc.set(disc.id, dem > 0 ? (target * cap) / dem : 1);
  }

  const demandData = rawDemand.map((d) => {
    const fte = d.fte * (scaleByDisc.get(d.disciplineId) ?? 1);
    return {
      projectId: d.projectId,
      disciplineId: d.disciplineId,
      month: dateFromKey(d.monthKey),
      monthKey: d.monthKey,
      hours: fte * HOURS_PER_FTE_MONTH,
      fte,
    };
  });
  // collapse duplicates on unique key (project,discipline,month) — sum
  const demandMerged = new Map<string, (typeof demandData)[number]>();
  for (const row of demandData) {
    const k = `${row.projectId}|${row.disciplineId}|${row.monthKey}`;
    const ex = demandMerged.get(k);
    if (ex) {
      ex.hours += row.hours;
      ex.fte += row.fte;
    } else demandMerged.set(k, { ...row });
  }
  const finalDemand = [...demandMerged.values()];
  await prisma.demand.createMany({ data: finalDemand });

  // set budgetHours = total demand per project
  const budgetByProject = new Map<string, number>();
  for (const d of finalDemand)
    budgetByProject.set(d.projectId, (budgetByProject.get(d.projectId) ?? 0) + d.hours);
  for (const [pid, hours] of budgetByProject)
    await prisma.project.update({ where: { id: pid }, data: { budgetHours: Math.round(hours) } });

  // ---- Allocations (greedy, deterministic) ----
  console.log("Seeding allocations…");
  // resource available hours per month
  const resByDisc = new Map<string, typeof resources>();
  for (const r of resources) {
    if (!r.active) continue;
    const arr = resByDisc.get(r.disciplineId) ?? [];
    arr.push(r);
    resByDisc.set(r.disciplineId, arr);
  }
  // demand grouped by discipline+month, each entry references its project (region)
  const projById = new Map(projects.map((p) => [p.id, p]));
  type AllocRow = {
    resourceId: string;
    projectId: string;
    disciplineId: string;
    monthKey: number;
    allocatedHours: number;
  };
  const allocRows: AllocRow[] = [];

  for (const monthKey of HORIZON) {
    const leave = LEAVE_BY_MONTH[(monthKey % 100) - 1];
    // remaining hours per resource this month
    const remaining = new Map<string, number>();
    for (const r of resources) {
      if (!r.active) continue;
      remaining.set(r.id, r.fteRatio * HOURS_PER_FTE_MONTH * (1 - leave));
    }
    // demand items this month grouped by discipline
    const monthDemand = finalDemand.filter((d) => d.monthKey === monthKey);
    const byDisc = new Map<string, typeof monthDemand>();
    for (const d of monthDemand) {
      const arr = byDisc.get(d.disciplineId) ?? [];
      arr.push(d);
      byDisc.set(d.disciplineId, arr);
    }
    for (const [discId, items] of byDisc) {
      // process projects by priority (1 first)
      const sorted = [...items].sort(
        (a, b) => projById.get(a.projectId)!.priority - projById.get(b.projectId)!.priority
      );
      const pool = resByDisc.get(discId) ?? [];
      for (const item of sorted) {
        let need = item.hours;
        const projRegion = projById.get(item.projectId)!.regionId;
        // prefer same-region resources, then others
        const ordered = [...pool].sort((a, b) => {
          const aLocal = a.regionId === projRegion ? 0 : 1;
          const bLocal = b.regionId === projRegion ? 0 : 1;
          if (aLocal !== bLocal) return aLocal - bLocal;
          return (remaining.get(b.id) ?? 0) - (remaining.get(a.id) ?? 0);
        });
        for (const r of ordered) {
          if (need <= 1) break;
          const avail = remaining.get(r.id) ?? 0;
          if (avail <= 1) continue;
          // a resource commits at most ~its remaining; cross-region capped lower
          const cap = r.regionId === projRegion ? avail : Math.min(avail, avail * 0.5);
          const give = Math.min(need, cap);
          if (give <= 1) continue;
          remaining.set(r.id, avail - give);
          need -= give;
          allocRows.push({
            resourceId: r.id,
            projectId: item.projectId,
            disciplineId: discId,
            monthKey,
            allocatedHours: give,
          });
        }
      }
    }
  }
  // merge alloc rows on unique key & build final
  const allocMerged = new Map<string, AllocRow>();
  for (const a of allocRows) {
    const k = `${a.resourceId}|${a.projectId}|${a.disciplineId}|${a.monthKey}`;
    const ex = allocMerged.get(k);
    if (ex) ex.allocatedHours += a.allocatedHours;
    else allocMerged.set(k, { ...a });
  }
  const resById = new Map(resources.map((r) => [r.id, r]));
  const allocData = [...allocMerged.values()].map((a) => {
    const r = resById.get(a.resourceId)!;
    const monthlyCap = r.fteRatio * HOURS_PER_FTE_MONTH;
    return {
      resourceId: a.resourceId,
      projectId: a.projectId,
      disciplineId: a.disciplineId,
      month: dateFromKey(a.monthKey),
      monthKey: a.monthKey,
      allocatedHours: a.allocatedHours,
      allocationPct: monthlyCap > 0 ? a.allocatedHours / monthlyCap : 0,
      billable: true,
    };
  });
  // batch insert (chunked)
  for (let i = 0; i < allocData.length; i += 1000) {
    await prisma.allocation.createMany({ data: allocData.slice(i, i + 1000) });
  }

  console.log("Seed complete:");
  console.log(`  regions:     ${regions.length}`);
  console.log(`  disciplines: ${disciplines.length}`);
  console.log(`  resources:   ${resources.length}`);
  console.log(`  projects:    ${projects.length}`);
  console.log(`  capacity:    ${capacityData.length}`);
  console.log(`  demand:      ${finalDemand.length}`);
  console.log(`  allocations: ${allocData.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
