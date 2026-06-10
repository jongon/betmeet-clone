"use server";

import { getOwnedPoolsNeedingTransfer } from "../services/account-deletion";
import { getCurrentUserId } from "../services/session";
import type { OwnedPoolTransfer } from "../types";

/** Read-only loader for the account-deletion modal (BL-9). */
export async function loadOwnedPoolsForDeletion(): Promise<OwnedPoolTransfer[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  return getOwnedPoolsNeedingTransfer(userId);
}
