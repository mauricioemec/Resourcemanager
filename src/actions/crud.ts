"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  regionSchema,
  disciplineSchema,
  projectSchema,
  resourceSchema,
} from "@/lib/validation/schemas";

function toObj(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

// ---- Regions ----
export async function saveRegion(formData: FormData) {
  const id = formData.get("id") as string | null;
  const data = regionSchema.parse(toObj(formData));
  if (id) await prisma.region.update({ where: { id }, data });
  else await prisma.region.create({ data });
  revalidatePath("/regions");
  revalidatePath("/dashboard");
}

export async function deleteRegion(formData: FormData) {
  const id = formData.get("id") as string;
  await prisma.region.delete({ where: { id } });
  revalidatePath("/regions");
}

// ---- Disciplines ----
export async function saveDiscipline(formData: FormData) {
  const id = formData.get("id") as string | null;
  const data = disciplineSchema.parse(toObj(formData));
  if (id) await prisma.discipline.update({ where: { id }, data });
  else await prisma.discipline.create({ data });
  revalidatePath("/disciplines");
  revalidatePath("/dashboard");
}

export async function deleteDiscipline(formData: FormData) {
  const id = formData.get("id") as string;
  await prisma.discipline.delete({ where: { id } });
  revalidatePath("/disciplines");
}

// ---- Projects ----
export async function saveProject(formData: FormData) {
  const id = formData.get("id") as string | null;
  const p = projectSchema.parse(toObj(formData));
  const data = {
    code: p.code,
    name: p.name,
    regionId: p.regionId,
    status: p.status,
    priority: p.priority,
    clientName: p.clientName || null,
    startDate: new Date(p.startDate),
    endDate: new Date(p.endDate),
  };
  if (id) await prisma.project.update({ where: { id }, data });
  else await prisma.project.create({ data });
  revalidatePath("/projects");
  revalidatePath("/dashboard");
}

export async function deleteProject(formData: FormData) {
  const id = formData.get("id") as string;
  await prisma.project.delete({ where: { id } });
  revalidatePath("/projects");
}

// ---- Resources ----
export async function saveResource(formData: FormData) {
  const id = formData.get("id") as string | null;
  const r = resourceSchema.parse({
    ...toObj(formData),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
  const data = {
    name: r.name,
    email: r.email,
    disciplineId: r.disciplineId,
    regionId: r.regionId,
    grade: r.grade,
    weeklyHours: r.weeklyHours,
    fteRatio: r.fteRatio,
    costRate: r.costRate ?? null,
    active: r.active,
  };
  if (id) await prisma.resource.update({ where: { id }, data });
  else await prisma.resource.create({ data });
  revalidatePath("/resources");
  revalidatePath("/dashboard");
}

export async function deleteResource(formData: FormData) {
  const id = formData.get("id") as string;
  await prisma.resource.delete({ where: { id } });
  revalidatePath("/resources");
}
