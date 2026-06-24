"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const HOURS_PER_FTE_MONTH = 160;

function dateFromKey(key: number): Date {
  return new Date(Date.UTC(Math.floor(key / 100), (key % 100) - 1, 1));
}

/**
 * Bulk upsert demand for a project. Payload is a JSON string of
 * { disciplineId, monthKey, hours }[] carried in the form field "payload".
 * Zero/blank hours delete the row.
 */
export async function upsertDemand(formData: FormData) {
  const projectId = formData.get("projectId") as string;
  const payload = JSON.parse((formData.get("payload") as string) || "[]") as {
    disciplineId: string;
    monthKey: number;
    hours: number;
  }[];

  for (const row of payload) {
    const hours = Number.isFinite(row.hours) ? row.hours : 0;
    const where = {
      projectId_disciplineId_monthKey: {
        projectId,
        disciplineId: row.disciplineId,
        monthKey: row.monthKey,
      },
    };
    if (hours <= 0) {
      await prisma.demand.deleteMany({
        where: { projectId, disciplineId: row.disciplineId, monthKey: row.monthKey },
      });
    } else {
      await prisma.demand.upsert({
        where,
        create: {
          projectId,
          disciplineId: row.disciplineId,
          month: dateFromKey(row.monthKey),
          monthKey: row.monthKey,
          hours,
          fte: hours / HOURS_PER_FTE_MONTH,
        },
        update: { hours, fte: hours / HOURS_PER_FTE_MONTH },
      });
    }
  }

  revalidatePath("/allocations");
  revalidatePath("/dashboard");
  revalidatePath(`/projects/${projectId}`);
}
