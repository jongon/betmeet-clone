"use server";

import { redirect } from "next/navigation";
import { sanitizeNext } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export async function verifyMfa(factorId: string, code: string, next?: string) {
  const supabase = await createClient();

  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeError) {
    return { error: challengeError.message };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });

  if (verifyError) {
    return { error: "Invalid code. Please check your authenticator app." };
  }

  // Return to the intended destination preserved through sign-in (FR-REFINE-13.1).
  redirect(sanitizeNext(next, "/"));
}

export async function getMfaFactors() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error) return { factors: [] };
  return { factors: data.totp };
}
