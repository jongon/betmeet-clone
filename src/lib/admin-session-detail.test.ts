import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildAdminProposalOverview,
  buildAdminSessionDetailPath,
  buildExactStickerSummary,
  buildRequestedRepeatedSummary,
  canAdminDecideSession,
  getAdminSessionBackHref,
  getAdminSessionStateLabel,
  isAdminSessionReadOnly,
} from "@/lib/admin-session-detail";
import { buildEmptyProposal, syncProposalBlocks } from "@/lib/cambio-proposal";
import { cloneDefaultExchangeSettings } from "@/lib/exchange-settings";

describe("admin session detail helpers", () => {
  test("builds detail navigation paths", () => {
    assert.equal(buildAdminSessionDetailPath("ses_123"), "/admin/sesiones/ses_123");
    assert.equal(getAdminSessionBackHref({ archivedAt: null }), "/admin");
    assert.equal(
      getAdminSessionBackHref({ archivedAt: "2026-06-06T10:00:00.000Z" }),
      "/admin/archivadas",
    );
  });

  test("derives read-only and decision states from session status", () => {
    const proposal = buildEmptyProposal();
    proposal.status = "pending";

    assert.equal(canAdminDecideSession({ status: "open", archivedAt: null, proposal }), true);
    assert.equal(
      canAdminDecideSession({ status: "open", archivedAt: null, proposal: buildEmptyProposal() }),
      false,
    );
    assert.equal(isAdminSessionReadOnly({ status: "open", archivedAt: null }), false);
    assert.equal(isAdminSessionReadOnly({ status: "closed", archivedAt: null }), true);
    assert.equal(
      isAdminSessionReadOnly({ status: "closed", archivedAt: "2026-06-06T10:00:00.000Z" }),
      true,
    );
    assert.equal(getAdminSessionStateLabel({ status: "open", archivedAt: null }), "Abierta");
    assert.equal(getAdminSessionStateLabel({ status: "closed", archivedAt: null }), "Cerrada");
    assert.equal(
      getAdminSessionStateLabel({ status: "closed", archivedAt: "2026-06-06T10:00:00.000Z" }),
      "Archivada",
    );
  });

  test("builds proposal overview for balance and requested repeateds", () => {
    const settings = cloneDefaultExchangeSettings();
    const proposal = buildEmptyProposal();
    proposal.status = "pending";
    proposal.selectedStickerCodes = ["ARG-7", "MEX-1"];
    proposal.blocks = syncProposalBlocks(proposal.selectedStickerCodes, [], settings, {});
    proposal.requestedRepeateds = [{ stickerCode: "POR-15", quantity: 2 }];

    const overview = buildAdminProposalOverview(proposal);

    assert.equal(overview.balance.offeredUnits, 3);
    assert.equal(overview.balance.requestedUnits, 2);
    assert.equal(overview.balance.delta, 1);
    assert.equal(overview.requestedRepeateds[0]?.stickerCode, "POR-15");
    assert.equal(overview.requestedRepeateds[0]?.quantity, 2);
  });

  test("enriches repeated and exact sticker summaries with labels", () => {
    const requested = buildRequestedRepeatedSummary([{ stickerCode: "ARG-7", quantity: 2 }]);
    const exact = buildExactStickerSummary(["MEX-1"]);

    assert.equal(requested[0]?.label, "Jugador 6");
    assert.equal(requested[0]?.quantity, 2);
    assert.equal(exact[0]?.label, "Badge de selección");
    assert.equal(exact[0]?.quantity, 1);
  });
});
