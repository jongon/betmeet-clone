"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { acceptSession as repoAccept, rejectSession as repoReject } from "@/lib/sessions-store";

const IdSchema = z.string().min(1);

export async function acceptSession(id: string): Promise<void> {
	const parsedId = IdSchema.parse(id);
	await repoAccept(parsedId);
	revalidatePath("/admin");
}

export async function rejectSession(id: string): Promise<void> {
	const parsedId = IdSchema.parse(id);
	await repoReject(parsedId);
	revalidatePath("/admin");
}
