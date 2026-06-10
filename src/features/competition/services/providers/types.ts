import type { ProviderSyncScope } from "@/generated/prisma/enums";
import type { NormalizedMatch, NormalizedTeam } from "../../schemas";

export interface ProviderSyncWindow {
  windowKey: string;
  from?: Date;
  to?: Date;
}

export interface NormalizedProviderPayload {
  teams: NormalizedTeam[];
  matches: NormalizedMatch[];
  providerRequestId?: string;
}

export interface CompetitionProvider {
  fetch(scope: ProviderSyncScope, window: ProviderSyncWindow): Promise<NormalizedProviderPayload>;
}
