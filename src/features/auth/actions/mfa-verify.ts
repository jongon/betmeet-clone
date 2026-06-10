"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function verifyMfa(factorId: string, code: string) {
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

  redirect("/");
}

export async function getMfaFactors() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error) return { factors: [] };
  return { factors: data.totp };
}
