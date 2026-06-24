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
  //
  // The ACTIVE flow is token_hash (`/auth/confirm`), whose static template ignores
  // `emailRedirectTo`. So the destination is carried in `user_metadata.invite_next`
  // (rendered by the template as `{{ .Data.invite_next }}`), which survives links
  // opened cross-device. Stored percent-encoded so paths with a query string don't
  // break the link's own query; `/auth/confirm` reads & decodes it via searchParams.
  // Always set (even the `/matches` default) so the template key is never missing
  // (a missing key renders `<no value>` and breaks the URL).
  //
  // `emailRedirectTo` (with `flow=email_confirm`) is kept as a fallback for the PKCE
  // template (`/auth/callback`); `flow` lets it distinguish an already-confirmed
  // email from a real OAuth failure (FR-REFINE-16.8).
  const next = sanitizeNext(formData.get("next") as string | null);
  const callbackParams = new URLSearchParams({ flow: "email_confirm" });
  if (next !== "/matches") callbackParams.set("next", next);
  const emailRedirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?${callbackParams.toString()}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo, data: { invite_next: encodeURIComponent(next) } },
  });

  if (error) {
    return { error: { _form: [error.message] } };
  }

  redirect("/verify-email");
}
