"use server";

import { redirect } from "next/navigation";
import { transferOwnedPoolsForAccountDeletion } from "@/features/pools/services/account-deletion";
import { logAuthEvent, redactEmail } from "@/lib/auth-logger";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function deleteAccount(
  poolOwnershipAssignments: { poolId: string; newOwnerId: string }[] = [],
) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { error: { _form: ["Not authenticated"] } };
  }

  const userId = userData.user.id;
  const email = userData.user.email ?? "";

  // Reassign or delete the user's pools before removing the account (BL-9).
  const transfer = await transferOwnedPoolsForAccountDeletion(userId, poolOwnershipAssignments);
  if (transfer.error) {
    return { error: { _form: [transfer.error] } };
  }

  // Soft-delete: set deleted_at on profile
  await prisma.profile.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });

  logAuthEvent("auth.account_deleted", {
    userId,
    email: redactEmail(email),
  });

  await supabase.auth.signOut();

  redirect("/auth/sign-in?deleted=true");
}
