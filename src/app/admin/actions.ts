"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  acceptPendingSessionForAdmin,
  archiveSession as repoArchive,
  rejectSession as repoReject,
} from "@/lib/sessions-store";
import { getAdminEmail } from "@/lib/supabase/server";

const IdSchema = z.string().min(1);

export async function acceptSession(id: string): Promise<void> {
  const parsedId = IdSchema.parse(id);
  const email = await getAdminEmail();
  await acceptPendingSessionForAdmin(parsedId, email);
  revalidatePath("/admin");
  revalidatePath("/admin/cromos");
  revalidatePath("/admin/cromos/faltantes");
  revalidatePath(`/admin/sesiones/${parsedId}`);
}

export async function rejectSession(id: string): Promise<void> {
  const parsedId = IdSchema.parse(id);
  await repoReject(parsedId);
  revalidatePath("/admin");
  revalidatePath(`/admin/sesiones/${parsedId}`);
}

export async function archiveSession(id: string): Promise<void> {
  const parsedId = IdSchema.parse(id);
  await repoArchive(parsedId);
  revalidatePath("/admin");
  revalidatePath("/admin/archivadas");
  revalidatePath(`/admin/sesiones/${parsedId}`);
}
