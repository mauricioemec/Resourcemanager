export const RNG_SEED = 20260101;

export const REGIONS = [
  { code: "NA", name: "North America", country: "USA" },
  { code: "LATAM", name: "Latin America", country: "Brazil" },
  { code: "EMEA", name: "Europe, Middle East & Africa", country: "UK" },
  { code: "ME", name: "Middle East", country: "UAE" },
  { code: "APAC", name: "Asia-Pacific", country: "Australia" },
] as const;

// Engineering disciplines (the matrix "function" axis), with stable colors.
export const DISCIPLINES = [
  { code: "CIV", name: "Civil", color: "#60a5fa", sortOrder: 1 },
  { code: "STR", name: "Structural", color: "#34d399", sortOrder: 2 },
  { code: "MEC", name: "Mechanical", color: "#f472b6", sortOrder: 3 },
  { code: "PIP", name: "Piping", color: "#fbbf24", sortOrder: 4 },
  { code: "PRO", name: "Process", color: "#a78bfa", sortOrder: 5 },
  { code: "ELE", name: "Electrical", color: "#22d3ee", sortOrder: 6 },
  { code: "INC", name: "Instrumentation & Control", color: "#fb923c", sortOrder: 7 },
  { code: "ENV", name: "Environmental", color: "#4ade80", sortOrder: 8 },
  { code: "GEO", name: "Geotechnical", color: "#c084fc", sortOrder: 9 },
  { code: "PCT", name: "Project Controls", color: "#f87171", sortOrder: 10 },
] as const;

export const GRADES = [
  { value: "JUNIOR", weight: 30, fteHours: 160 },
  { value: "MID", weight: 35, fteHours: 160 },
  { value: "SENIOR", weight: 22, fteHours: 160 },
  { value: "PRINCIPAL", weight: 8, fteHours: 160 },
  { value: "LEAD", weight: 5, fteHours: 160 },
] as const;

// Project archetypes define the discipline mix → believable heatmaps.
export const ARCHETYPES = [
  {
    name: "Industrial Plant",
    mix: { MEC: 1.0, PIP: 0.9, PRO: 0.8, ELE: 0.6, INC: 0.6, STR: 0.4, PCT: 0.3 },
  },
  {
    name: "Civil Infrastructure",
    mix: { CIV: 1.0, STR: 0.9, GEO: 0.7, ENV: 0.5, ELE: 0.3, PCT: 0.3 },
  },
  {
    name: "Power & Utilities",
    mix: { ELE: 1.0, INC: 0.8, MEC: 0.6, CIV: 0.5, STR: 0.4, PCT: 0.3 },
  },
  {
    name: "Oil & Gas Upgrade",
    mix: { PRO: 1.0, PIP: 0.9, MEC: 0.8, INC: 0.7, ELE: 0.5, STR: 0.4, PCT: 0.4 },
  },
  {
    name: "Environmental Remediation",
    mix: { ENV: 1.0, GEO: 0.8, CIV: 0.6, STR: 0.3, PCT: 0.2 },
  },
] as const;

export const PROJECT_COUNT = 42;
export const RESOURCE_COUNT = 360;

// Discipline staffing weight across the whole company (relative headcount).
export const DISCIPLINE_HEADCOUNT_WEIGHT: Record<string, number> = {
  CIV: 1.3,
  STR: 1.1,
  MEC: 1.2,
  PIP: 0.9,
  PRO: 0.8,
  ELE: 1.0,
  INC: 0.6,
  ENV: 0.5,
  GEO: 0.5,
  PCT: 0.6,
};

// Region size weights (relative headcount per region).
export const REGION_WEIGHT: Record<string, number> = {
  NA: 1.4,
  LATAM: 1.0,
  EMEA: 1.3,
  ME: 0.7,
  APAC: 1.1,
};
