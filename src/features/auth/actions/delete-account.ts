"use server";

import { redirect } from "next/navigation";
import { transferOwnedPoolsForAccountDeletion } from "@/features/pools/services/account-deletion";
import { logAuthEvent, redactEmail } from "@/lib/auth-logger";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Soft-delete the profile: keeps the row (and its prediction/scoring history)
  // for FK integrity. There is no FK from profiles.id to auth.users, so the row
  // survives the auth purge below (WF-11 / RULE-SEC-03).
  await prisma.profile.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });

  // Hard-delete the auth.users record via the Admin API so the account is really
  // gone: the user can no longer sign in, every active session is invalidated and
  // the email is freed. This is WF-11 step 2 / RULE-SEC-03 (FR-REFINE-21.1) and was
  // previously missing — a plain signOut left the auth user in place.
  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return { error: { _form: ["No se pudo eliminar la cuenta. Inténtalo de nuevo."] } };
  }

  logAuthEvent("auth.account_deleted", {
    userId,
    email: redactEmail(email),
  });

  await supabase.auth.signOut();

  redirect("/sign-in?deleted=true");
}
