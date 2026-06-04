import type { StickerOverride } from "@/lib/exchange-settings";
import { isStickerMissingForAdmin } from "@/lib/missing";

export type ExactProposalValidation =
  | { status: "pending" }
  | { status: "rechazada automaticamente"; stickerCode: string; reason: string };

export async function validateExactRequestedStickersForProposal(
  ownerEmail: string,
  requestedStickerCodes: string[],
  overrides: Record<string, StickerOverride>,
): Promise<ExactProposalValidation> {
  for (const requestedStickerCode of requestedStickerCodes) {
    for (const override of Object.values(overrides)) {
      const exactStickerCode = override.exact?.stickerCode;
      if (!exactStickerCode || exactStickerCode !== requestedStickerCode) {
        continue;
      }

      if (!(await isStickerMissingForAdmin(ownerEmail, requestedStickerCode))) {
        return {
          status: "rechazada automaticamente",
          stickerCode: requestedStickerCode,
          reason: `La propuesta se rechazó automáticamente porque ${requestedStickerCode} ya no está marcado como faltante.`,
        };
      }
    }
  }

  return { status: "pending" };
}
