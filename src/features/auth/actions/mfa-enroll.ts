"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function enrollMfa() {
  const supabase = await createClient();

  // Opening the enrollment modal creates a factor; abandoning it (closing without
  // verifying) leaves an unverified factor behind. Supabase requires friendly_name
  // to be unique per user, so accumulated unverified factors collide on the next
  // enroll. Clean them up first, then enroll with a friendly name unique among the
  // remaining (verified) factors.
  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const totpFactors = (factorsData?.all ?? []).filter((factor) => factor.factor_type === "totp");

  await Promise.all(
    totpFactors
      .filter((factor) => factor.status === "unverified")
      .map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id })),
  );

  const verifiedNames = new Set(
    totpFactors
      .filter((factor) => factor.status === "verified")
      .map((factor) => factor.friendly_name),
  );
  let friendlyName = "Authenticator app";
  for (let i = 2; verifiedNames.has(friendlyName); i++) {
    friendlyName = `Authenticator app ${i}`;
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName });
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
