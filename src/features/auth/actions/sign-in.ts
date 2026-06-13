"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logAuthEvent, redactEmail } from "@/lib/auth-logger";
import { prisma } from "@/lib/prisma";
import { sanitizeNext } from "@/lib/safe-redirect";
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
      /** Forwarded to the MFA step so it can return to the intended destination. */
      next?: string;
      /** Set when sign-in failed because the email is not yet confirmed (FR-REFINE-12.1). */
      unconfirmedEmail?: string;
    }
  | undefined;

export async function signIn(formData: FormData): Promise<SignInState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    rememberMe: formData.get("rememberMe") === "true",
  };
  // Destination to return to after sign-in (e.g. an invite link), guarded against
  // open redirects (FR-REFINE-13.1).
  const next = sanitizeNext(formData.get("next") as string | null);

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
    // Unconfirmed email: surface the resend / change-email recovery flow inline
    // instead of a generic credential error (FR-REFINE-12.1).
    if (error.code === "email_not_confirmed" || /not confirmed/i.test(error.message)) {
      return { unconfirmedEmail: parsed.data.email };
    }
    return { error: { _form: ["Invalid email or password"] } };
  }

  // MFA check: if user has MFA enrolled, return challenge flow trigger
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalData?.nextLevel === "aal2" && aalData.nextLevel !== aalData.currentLevel) {
    return { requiresMfa: true, next };
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

  const userProfile = await prisma.profile.findUnique({
    where: { id: profile.id },
    select: { onboardingCompleted: true },
  });

  if (!userProfile?.onboardingCompleted) {
    redirect(`/onboarding/profile?next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}
