"use server";

import { broadcastResultsUpdated } from "@/features/competition/services/broadcast-results-updated";
import { runScheduledSync } from "@/features/competition/services/run-scheduled-sync";
import type { ProviderSyncScope } from "@/generated/prisma/enums";
import { logAuthEvent } from "@/lib/auth-logger";
import { getAdminUserId } from "../services/require-admin";
import { revalidateResultViews } from "../services/revalidate-result-views";

const ALLOWED_SCOPES: ProviderSyncScope[] = ["FIXTURES", "LIVE_STATUS", "RESULTS", "FULL"];

/**
 * Admin-triggered competition sync (BL-5, BR-7.11). Delegates to the shared
 * scheduled-sync orchestration (Unit 50) — the same path the automated crons
 * use — then logs and revalidates. Respects Unit 4's sync lock.
 */
export async function triggerSync(scope: ProviderSyncScope) {
  const adminId = await getAdminUserId();
  if (!adminId) return { error: "No autorizado" };
  if (!ALLOWED_SCOPES.includes(scope)) return { error: "Scope inválido" };

  const result = await runScheduledSync(scope, { source: "manual" });
  if (!result.ok) {
    return { error: result.error ?? "La sincronización falló. Revisa los runs recientes." };
  }

  logAuthEvent("admin.sync_triggered", { userId: adminId, scope });
  revalidateResultViews({ adminDashboard: true });
  await broadcastResultsUpdated(); // Unit 58: push synced results to live viewers

  return { success: true };
}
