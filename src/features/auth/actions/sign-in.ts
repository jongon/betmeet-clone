"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logAuthEvent, redactEmail } from "@/lib/auth-logger";
import { createClient } from "@/lib/supabase/server";
import { SignInSchema } from "../schemas";

type SignInState =
  | {
      error?: {
        email?: string[];
        password?: string[];
        rememberMe?: string[];
        _form?: string[];
      };
      requiresMfa?: boolean;
    }
  | undefined;

export async function signIn(formData: FormData): Promise<SignInState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    rememberMe: formData.get("rememberMe") === "true",
  };

  const parsed = SignInSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    logAuthEvent("auth.sign_in_failed", {
      method: "email",
      email: redactEmail(parsed.data.email),
      reason: error.message,
    });
    return { error: { _form: ["Invalid email or password"] } };
  }

  // MFA check: if user has MFA enrolled, return challenge flow trigger
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalData?.nextLevel === "aal2" && aalData.nextLevel !== aalData.currentLevel) {
    return { requiresMfa: true };
  }

  if (parsed.data.rememberMe) {
    const cookieStore = await cookies();
    // Extend session cookie to 30 days by refreshing with long-lived cookie
    cookieStore.set("remember_me", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  const profile = data.user;
  if (!profile) {
    return { error: { _form: ["Sign in failed. Please try again."] } };
  }

  redirect("/matches");
}
