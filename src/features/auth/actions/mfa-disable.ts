"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function disableMfa(factorId: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    return { error: error.message };
  }

  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    // Check if any other factors remain
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const hasOtherFactors = (factorsData?.totp?.length ?? 0) > 0;

    if (!hasOtherFactors) {
      await prisma.profile.update({
        where: { id: userData.user.id },
        data: { mfaEnabled: false },
      });
    }
  }

  return { success: true };
}
