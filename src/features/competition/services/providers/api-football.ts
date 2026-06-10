import type { ProviderSyncScope } from "@/generated/prisma/enums";
import type { CompetitionProvider, NormalizedProviderPayload, ProviderSyncWindow } from "./types";

export class ApiFootballProvider implements CompetitionProvider {
  async fetch(
    _scope: ProviderSyncScope,
    _window: ProviderSyncWindow,
  ): Promise<NormalizedProviderPayload> {
    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!apiKey) {
      throw new Error("API_FOOTBALL_KEY_MISSING");
    }

    // The normalized pipeline is ready for real API-Football calls. The MVP seed
    // keeps previews/local usable without consuming provider quota.
    return { teams: [], matches: [] };
  }
}
