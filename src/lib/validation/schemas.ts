import { z } from "zod";

export const regionSchema = z.object({
  code: z.string().min(1).max(12),
  name: z.string().min(1),
  country: z.string().optional().nullable(),
});

export const disciplineSchema = z.object({
  code: z.string().min(1).max(8),
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "hex color"),
  sortOrder: z.coerce.number().int().default(0),
});

export const projectSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  regionId: z.string().min(1),
  status: z.enum(["PIPELINE", "ACTIVE", "ON_HOLD", "CLOSED"]),
  priority: z.coerce.number().int().min(1).max(5),
  clientName: z.string().optional().nullable(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export const resourceSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  disciplineId: z.string().min(1),
  regionId: z.string().min(1),
  grade: z.enum(["JUNIOR", "MID", "SENIOR", "PRINCIPAL", "LEAD"]),
  weeklyHours: z.coerce.number().min(1).max(80).default(40),
  fteRatio: z.coerce.number().min(0.1).max(1).default(1),
  costRate: z.coerce.number().optional().nullable(),
  active: z.coerce.boolean().default(true),
});

export type RegionInput = z.infer<typeof regionSchema>;
export type DisciplineInput = z.infer<typeof disciplineSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type ResourceInput = z.infer<typeof resourceSchema>;
