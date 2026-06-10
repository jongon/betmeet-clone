"use server";

import { createClient } from "@/lib/supabase/server";

export async function startPasskeyRegistration() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "webauthn",
    friendlyName: "Passkey",
  } as Parameters<typeof supabase.auth.mfa.enroll>[0]);

  if (error) {
    return { error: error.message };
  }

  return { creationOptions: data };
}

export async function verifyPasskeyRegistration(factorId: string, credential: object) {
  const supabase = await createClient();

  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeError) {
    return { error: challengeError.message };
  }

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code: JSON.stringify(credential),
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
