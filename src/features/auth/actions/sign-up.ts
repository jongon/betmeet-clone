"use server";

import { redirect } from "next/navigation";
import { sanitizeNext } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { SignUpSchema } from "../schemas";

type SignUpState =
  | {
      error?: {
        email?: string[];
        password?: string[];
        confirmPassword?: string[];
        _form?: string[];
      };
    }
  | undefined;

export async function signUp(formData: FormData): Promise<SignUpState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = SignUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // Preserve the intended destination (e.g. an invite link) through email
  // confirmation (FR-REFINE-13.1). Guarded against open redirects.
  const next = sanitizeNext(formData.get("next") as string | null);
  const baseCallback = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
  const emailRedirectTo =
    next !== "/matches" ? `${baseCallback}?next=${encodeURIComponent(next)}` : baseCallback;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo },
  });

  if (error) {
    return { error: { _form: [error.message] } };
  }

  redirect("/verify-email");
}
