"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CAMBIADOR_COOKIE } from "@/lib/cambiador-identity";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignInState = { error: string | null };

const signInSchema = z.object({
  email: z.string().email("Email no válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

/**
 * `next` is only honored if it is a path within our own app. The literal
 * root path "/" is treated as invalid because there is no public landing
 * page — every visitor is bounced into the admin area.
 */
function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/admin";
  if (!value.startsWith("/") || value.startsWith("//")) return "/admin";
  if (value === "/") return "/admin";
  return value;
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  };

  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { error: firstIssue?.message ?? "Datos no válidos" };
  }

  const remember = formData.get("remember") === "on";
  const supabase = await createSupabaseServerClient({ persistSession: remember });
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Credenciales no válidas" };
  }

  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  for (const cookie of allCookies) {
    if (cookie.name === CAMBIADOR_COOKIE || cookie.name.startsWith("cambio_session_")) {
      cookieStore.set(cookie.name, "", { maxAge: 0, path: "/" });
    }
  }

  redirect(safeNext(raw.next));
}
