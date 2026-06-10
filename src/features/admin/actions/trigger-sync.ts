"use server";

import { revalidatePath } from "next/cache";
import { ApiFootballProvider } from "@/features/competition/services/providers/api-football";
import { runCompetitionSync } from "@/features/competition/services/sync-orchestrator";
import { scoreFinishedUnscoredMatches } from "@/features/scoring-rankings/services/score-sweeper";
import type { ProviderSyncScope } from "@/generated/prisma/enums";
import { logAuthEvent } from "@/lib/auth-logger";
import { getAdminUserId } from "../services/require-admin";

const ALLOWED_SCOPES: ProviderSyncScope[] = ["FIXTURES", "LIVE_STATUS", "RESULTS", "FULL"];

/**
 * Admin-triggered competition sync (BL-5, BR-7.11), followed by the scoring
 * sweeper (post-sync). Respects Unit 4's sync lock.
 */
export async function triggerSync(scope: ProviderSyncScope) {
  const adminId = await getAdminUserId();
  if (!adminId) return { error: "No autorizado" };
  if (!ALLOWED_SCOPES.includes(scope)) return { error: "Scope inválido" };

  try {
    const provider = new ApiFootballProvider();
    const windowKey = `manual-${scope}-${new Date().toISOString().slice(0, 10)}`;
    await runCompetitionSync(provider, scope, { windowKey });
    await scoreFinishedUnscoredMatches();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "API_FOOTBALL_KEY_MISSING") {
      return { error: "Falta configurar API_FOOTBALL_KEY para el proveedor." };
    }
    return { error: "La sincronización falló. Revisa los runs recientes." };
  }

  logAuthEvent("admin.sync_triggered", { userId: adminId, scope });
  revalidatePath("/admin");
  return { success: true };
}
