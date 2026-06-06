import {
  buildProposalBalanceReason,
  buildRequestedStickers,
  formatCounterofferOffers,
  formatPublicRuleOptions,
  getProposalBalance,
} from "@/lib/cambio-proposal";
import type {
  ProposalBlock,
  RequestedRepeatedItem,
  Session,
  SessionProposal,
} from "@/lib/sessions";

const dateFormatter = new Intl.DateTimeFormat("es", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatAdminSessionDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function buildAdminSessionDetailPath(sessionId: string): string {
  return `/admin/sesiones/${sessionId}`;
}

export function getAdminSessionBackHref(session: Pick<Session, "archivedAt">): string {
  return session.archivedAt ? "/admin/archivadas" : "/admin";
}

export function getAdminSessionBackLabel(session: Pick<Session, "archivedAt">): string {
  return session.archivedAt ? "Volver a archivadas" : "Volver a sesiones";
}

export function isAdminSessionReadOnly(session: Pick<Session, "status" | "archivedAt">): boolean {
  return session.status === "closed" || Boolean(session.archivedAt);
}

export function canAdminDecideSession(
  session: Pick<Session, "status" | "archivedAt" | "proposal">,
): boolean {
  return session.status === "open" && !session.archivedAt && session.proposal?.status === "pending";
}

export function getAdminSessionStateLabel(
  session: Pick<Session, "status" | "archivedAt">,
): "Abierta" | "Cerrada" | "Archivada" {
  if (session.archivedAt) {
    return "Archivada";
  }

  return session.status === "open" ? "Abierta" : "Cerrada";
}

type StickerSummary = {
  stickerCode: string;
  label: string;
  type: ProposalBlock["requestedStickerType"];
  quantity: number;
};

export function buildRequestedRepeatedSummary(
  requestedRepeateds: RequestedRepeatedItem[],
): StickerSummary[] {
  const stickerByCode = new Map(
    buildRequestedStickers(requestedRepeateds.map((item) => item.stickerCode)).map((sticker) => [
      sticker.code,
      sticker,
    ]),
  );

  return requestedRepeateds.map((item) => {
    const sticker = stickerByCode.get(item.stickerCode);

    return {
      stickerCode: item.stickerCode,
      label: sticker?.label ?? item.stickerCode,
      type: sticker?.type ?? "PLAYER",
      quantity: item.quantity,
    };
  });
}

export function buildExactStickerSummary(stickerCodes: string[]): StickerSummary[] {
  return buildRequestedStickers(stickerCodes).map((sticker) => ({
    stickerCode: sticker.code,
    label: sticker.label,
    type: sticker.type,
    quantity: 1,
  }));
}

export function buildAdminProposalOverview(proposal: SessionProposal) {
  const balance = getProposalBalance(proposal.blocks, proposal.requestedRepeateds);

  return {
    balance,
    balanceReason: buildProposalBalanceReason(balance),
    requestedRepeateds: buildRequestedRepeatedSummary(proposal.requestedRepeateds),
  };
}

export function buildAdminBlockDetail(block: ProposalBlock) {
  return {
    ruleOptions: formatPublicRuleOptions(block),
    counterofferOffers: formatCounterofferOffers(block.counteroffer),
    exactStickerSummaries: buildExactStickerSummary(block.counteroffer?.exactStickerCodes ?? []),
  };
}
