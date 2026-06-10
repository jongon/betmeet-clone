"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function enrollMfa() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) {
    return { error: error.message };
  }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

export async function confirmMfaEnrollment(factorId: string, code: string) {
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
    return { error: "Invalid code. Please try again." };
  }

  // Mark MFA enabled on profile
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    await prisma.profile.update({
      where: { id: userData.user.id },
      data: { mfaEnabled: true },
    });
  }

  return { success: true };
}
