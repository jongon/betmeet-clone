"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { compareAlbumStickerCodes, type StickerType } from "@/lib/album-catalog";
import {
  type AvailableRepeatedSticker,
  buildEmptyProposal,
  buildProposalBlock,
  collectCounterofferExactStickerCodes,
  countRequestedRepeateds,
  filterRequestedStickers,
  formatCounterofferCodes,
  formatCounterofferOffers,
  formatPublicRuleOptions,
  getDecisionSummary,
  getModeLabel,
  getProposalBalance,
  getProposalBlockCapacity,
  isCounterofferValid,
  normalizeProposalDraft,
  type RequestedSticker,
  resolveExactStickerInput,
  summarizeRule,
  syncProposalBlocks,
  syncRequestedRepeatedsWithExactStickerCodes,
  validateExactStickerCodesAgainstAvailableItems,
  validateUniqueCounterofferExactStickerCodes,
} from "@/lib/cambio-proposal";
import type { ExchangeSettings, OfferType, StickerOverride } from "@/lib/exchange-settings";
import { matchesFlexibleSearch } from "@/lib/search";
import type { ProposalBlock, SessionProposal } from "@/lib/sessions";
import { cn } from "@/lib/utils";
import {
  saveCambioProposalDraftAction,
  submitCambioProposalAction,
  validateCambioProposalStepAction,
} from "./actions";

const STEP_LABELS = [
  "1. Elige qué ofreces",
  "2. Elige qué quieres recibir",
  "3. Revisa y envía",
] as const;

const EMPTY_COUNTEROFFER_OFFERS = {
  PLAYER: 0,
  BADGE: 0,
  TEAM_PHOTO: 0,
  SPECIAL: 0,
  ANY: 0,
} as const;

const OFFER_TYPE_LABEL: Record<OfferType, string> = {
  PLAYER: "Jugador",
  BADGE: "Badge",
  TEAM_PHOTO: "Equipo",
  SPECIAL: "Especial",
  ANY: "Cualquiera",
};

const STICKER_TYPE_LABEL: Record<StickerType, string> = {
  PLAYER: "Jugador",
  BADGE: "Badge",
  TEAM_PHOTO: "Equipo",
  SPECIAL: "Especial",
};

type ProposalWizardProps = {
  token: string;
  sessionId: string;
  cambiadorName: string;
  requestedStickers: RequestedSticker[];
  availableRepeatedStickers: AvailableRepeatedSticker[];
  initialProposal: SessionProposal | null;
  globalSettings: ExchangeSettings;
  overrides: Record<string, StickerOverride>;
};

function buildInitialDraft(
  initialProposal: SessionProposal | null,
  globalSettings: ExchangeSettings,
  overrides: Record<string, StickerOverride>,
  availableRepeatedItems: Record<string, number>,
): SessionProposal {
  const draft = normalizeProposalDraft(
    initialProposal ?? buildEmptyProposal(),
    globalSettings,
    overrides,
  );
  return {
    ...draft,
    requestedRepeateds: syncRequestedRepeatedsWithExactStickerCodes(
      draft.requestedRepeateds,
      draft.blocks,
      availableRepeatedItems,
    ),
  };
}

function RuleOptions({
  block,
  title = "Se cambia por una de estas opciones",
  tone = "default",
}: {
  block: ProposalBlock;
  title?: string;
  tone?: "default" | "muted";
}) {
  const options = formatPublicRuleOptions(block);

  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin opciones de intercambio.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Badge
            key={option}
            variant={tone === "muted" ? "outline" : "secondary"}
            className={tone === "muted" ? "bg-background" : undefined}
          >
            {option}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function getCounterofferSummary(block: ProposalBlock): string {
  const counteroffer = block.counteroffer;
  if (!counteroffer) return "Sin contraoferta";

  const parts: string[] = [];
  parts.push(...formatCounterofferOffers(counteroffer));
  if (counteroffer.exactStickerCodes.length > 0) {
    parts.push(counteroffer.exactStickerCodes.join(", "));
  }
  return parts.join(" + ") || "Sin detalle";
}

function StepEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function ProposalWizard({
  token,
  sessionId,
  cambiadorName,
  requestedStickers,
  availableRepeatedStickers,
  initialProposal,
  globalSettings,
  overrides,
}: ProposalWizardProps) {
  const availableRepeatedItems = useMemo(
    () =>
      Object.fromEntries(
        availableRepeatedStickers.map((sticker) => [sticker.code, sticker.availableQuantity]),
      ),
    [availableRepeatedStickers],
  );
  const [draft, setDraft] = useState(() =>
    buildInitialDraft(initialProposal, globalSettings, overrides, availableRepeatedItems),
  );
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawerBlock, setDrawerBlock] = useState<ProposalBlock | null>(null);
  const [drawerExactInput, setDrawerExactInput] = useState("");
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [confirmDiscardCounteroffer, setConfirmDiscardCounteroffer] = useState(false);
  const [highlightBalance, setHighlightBalance] = useState(false);
  const [exactInputByCode, setExactInputByCode] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (initialProposal?.blocks ?? []).map((block) => [
        block.requestedStickerCode,
        formatCounterofferCodes(block.counteroffer?.exactStickerCodes ?? []),
      ]),
    ),
  );
  const [expandedCounterofferCodes, setExpandedCounterofferCodes] = useState<string[]>(() =>
    (initialProposal?.blocks ?? [])
      .filter((block) => block.mode === "counteroffer")
      .map((block) => block.requestedStickerCode),
  );
  const [isPending, startTransition] = useTransition();
  const [blockErrors, setBlockErrors] = useState<Record<string, string>>({});
  const wizardTopRef = useRef<HTMLDivElement | null>(null);
  const blockRefs = useRef(new Map<string, HTMLElement>());
  const balanceRef = useRef<HTMLElement | null>(null);
  const repeatedsSectionRef = useRef<HTMLElement | null>(null);
  const offersSectionRef = useRef<HTMLElement | null>(null);

  const blocksByCode = useMemo(
    () => new Map(draft.blocks.map((block) => [block.requestedStickerCode, block])),
    [draft.blocks],
  );
  const requestedStickerByCode = useMemo(
    () => new Map(requestedStickers.map((sticker) => [sticker.code, sticker])),
    [requestedStickers],
  );
  const availableRepeatedByCode = useMemo(
    () => new Map(availableRepeatedStickers.map((sticker) => [sticker.code, sticker])),
    [availableRepeatedStickers],
  );
  const visibleRequestedStickers = useMemo(
    () => filterRequestedStickers(requestedStickers, { group: search, type: "ALL", search }),
    [requestedStickers, search],
  );
  const visibleAvailableRepeatedStickers = useMemo(
    () =>
      availableRepeatedStickers.filter((sticker) =>
        matchesFlexibleSearch(
          search,
          sticker.code,
          sticker.label,
          sticker.groupCode,
          sticker.groupName,
          STICKER_TYPE_LABEL[sticker.type],
        ),
      ),
    [availableRepeatedStickers, search],
  );
  const decisionSummary = useMemo(() => getDecisionSummary(draft.blocks), [draft.blocks]);
  const isSubmitted = draft.status === "pending";
  const balance = useMemo(
    () => getProposalBalance(draft.blocks, draft.requestedRepeateds),
    [draft.blocks, draft.requestedRepeateds],
  );
  const lockedRequestedRepeatedCodes = useMemo(
    () => new Set(collectCounterofferExactStickerCodes(draft.blocks)),
    [draft.blocks],
  );

  const syncDraft = (nextDraft: SessionProposal): SessionProposal => ({
    ...nextDraft,
    requestedRepeateds: syncRequestedRepeatedsWithExactStickerCodes(
      nextDraft.requestedRepeateds,
      nextDraft.blocks,
      availableRepeatedItems,
    ),
  });

  const persistDraft = (nextDraft: SessionProposal, submit = false) => {
    const syncedDraft = syncDraft(nextDraft);

    setDraft(syncedDraft);
    setError(null);
    setBlockErrors({});
    setFeedback(submit ? "Enviando propuesta..." : "Guardando borrador...");

    startTransition(async () => {
      try {
        const saved = submit
          ? await submitCambioProposalAction({ token, sessionId, proposal: syncedDraft })
          : await saveCambioProposalDraftAction({ token, sessionId, proposal: syncedDraft });

        setDraft(saved);
        setFeedback(submit ? "Propuesta enviada." : "Borrador guardado.");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No se pudo guardar la propuesta.");
        setFeedback(null);
      }
    });
  };

  const replaceSelectedStickers = (
    selectedStickerCodes: string[],
    currentStep = draft.currentStep,
  ) => {
    const nextDraft: SessionProposal = {
      ...draft,
      currentStep,
      status: "draft",
      submittedAt: null,
      updatedAt: new Date().toISOString(),
      selectedStickerCodes,
      blocks: syncProposalBlocks(selectedStickerCodes, draft.blocks, globalSettings, overrides),
    };

    persistDraft(nextDraft);
  };

  const replaceRequestedRepeateds = (
    requestedRepeateds: SessionProposal["requestedRepeateds"],
    currentStep = draft.currentStep,
  ) => {
    persistDraft({
      ...draft,
      currentStep,
      requestedRepeateds,
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleSticker = (stickerCode: string) => {
    const selected = new Set(draft.selectedStickerCodes);
    if (selected.has(stickerCode)) {
      selected.delete(stickerCode);
      setExpandedCounterofferCodes((current) => current.filter((code) => code !== stickerCode));
    } else {
      selected.add(stickerCode);
    }

    replaceSelectedStickers(
      Array.from(selected).sort((left, right) => compareAlbumStickerCodes(left, right)),
      draft.currentStep,
    );
  };

  const updateStep = (currentStep: number) => {
    setSearch("");
    persistDraft({ ...draft, currentStep, updatedAt: new Date().toISOString() });
  };

  const continueToStep = (nextStep: number) => {
    setError(null);
    setBlockErrors({});
    setFeedback("Validando propuesta...");

    const localBlockErrors: Record<string, string> = {};
    for (const block of draft.blocks) {
      if (block.mode !== "counteroffer") {
        continue;
      }

      const exactInput = exactInputByCode[block.requestedStickerCode] ?? "";
      const resolvedExactInput = resolveExactStickerInput(exactInput, { forceFinalized: true });

      if (resolvedExactInput.issue) {
        localBlockErrors[block.requestedStickerCode] = resolvedExactInput.issue.reason;
      }
    }

    if (Object.keys(localBlockErrors).length > 0) {
      setSearch("");
      setBlockErrors(localBlockErrors);
      setFeedback(null);

      const firstCode = Object.keys(localBlockErrors)[0];
      if (firstCode) {
        setTimeout(() => {
          const el = blockRefs.current.get(firstCode);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 50);
      }
      return;
    }

    startTransition(async () => {
      try {
        const result = await validateCambioProposalStepAction({
          token,
          sessionId,
          proposal: draft,
        });
        if (!result.ok) {
          setSearch("");
          const offendingCodes = draft.blocks
            .filter((block) => block.counteroffer?.exactStickerCodes?.includes(result.stickerCode))
            .map((block) => block.requestedStickerCode);

          const newBlockErrors: Record<string, string> = {};
          for (const code of offendingCodes) {
            newBlockErrors[code] = result.reason;
          }
          setBlockErrors(newBlockErrors);
          setFeedback(null);

          if (offendingCodes.length > 0) {
            const firstCode = offendingCodes[0];
            setTimeout(() => {
              const el = blockRefs.current.get(firstCode);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }, 50);
          } else {
            setError(result.reason);
          }
          return;
        }

        setSearch("");
        persistDraft({ ...draft, currentStep: nextStep, updatedAt: new Date().toISOString() });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No se pudo validar la propuesta.");
        setFeedback(null);
      }
    });
  };

  const updateBlock = (stickerCode: string, updater: (block: ProposalBlock) => ProposalBlock) => {
    const nextBlocks = draft.blocks.map((block) =>
      block.requestedStickerCode === stickerCode ? updater(block) : block,
    );

    persistDraft({ ...draft, blocks: nextBlocks, updatedAt: new Date().toISOString() });
  };

  const updateCounterofferBlock = (
    stickerCode: string,
    updater: (
      counteroffer: NonNullable<ProposalBlock["counteroffer"]>,
    ) => NonNullable<ProposalBlock["counteroffer"]>,
  ) => {
    updateBlock(stickerCode, (current) => ({
      ...current,
      mode: "counteroffer",
      modeLabel: getModeLabel("counteroffer"),
      counteroffer: updater(
        current.counteroffer ?? {
          offers: { ...EMPTY_COUNTEROFFER_OFFERS },
          exactStickerCodes: [],
          note: null,
        },
      ),
    }));
  };

  const clearCounteroffer = (stickerCode: string) => {
    setExpandedCounterofferCodes((current) => current.filter((code) => code !== stickerCode));
    updateBlock(stickerCode, (current) => ({
      ...current,
      mode: "fulfill",
      modeLabel: getModeLabel("fulfill"),
      counteroffer: null,
    }));
  };

  const toggleCounterofferPanel = (stickerCode: string) => {
    setExpandedCounterofferCodes((current) =>
      current.includes(stickerCode)
        ? current.filter((code) => code !== stickerCode)
        : [...current, stickerCode],
    );
  };

  const currentStep = isSubmitted ? 3 : draft.currentStep;
  const canContinueFromStep =
    currentStep === 1
      ? draft.selectedStickerCodes.length > 0 &&
        draft.blocks.every((block) => isCounterofferValid(block))
      : currentStep === 2
        ? availableRepeatedStickers.length === 0 || draft.requestedRepeateds.length > 0
        : true;

  const selectedBlocks = draft.selectedStickerCodes
    .map((code) => blocksByCode.get(code))
    .filter((block): block is ProposalBlock => Boolean(block));
  const visibleSelectedBlocks = selectedBlocks.filter((block) => {
    const sticker = requestedStickerByCode.get(block.requestedStickerCode);
    return matchesFlexibleSearch(
      search,
      block.requestedStickerCode,
      block.requestedStickerLabel,
      sticker?.groupCode ?? "",
      sticker?.groupName ?? "",
      STICKER_TYPE_LABEL[block.requestedStickerType],
      ...formatPublicRuleOptions(block),
      block.modeLabel,
    );
  });
  const visibleRequestedRepeateds = draft.requestedRepeateds.filter((item) => {
    const sticker = availableRepeatedByCode.get(item.stickerCode);
    return matchesFlexibleSearch(
      search,
      item.stickerCode,
      sticker?.label ?? "",
      sticker?.groupCode ?? "",
      sticker?.groupName ?? "",
    );
  });
  const toggleRequestedRepeated = (stickerCode: string) => {
    if (lockedRequestedRepeatedCodes.has(stickerCode)) {
      return;
    }

    const existing = draft.requestedRepeateds.find((item) => item.stickerCode === stickerCode);
    if (existing) {
      replaceRequestedRepeateds(
        draft.requestedRepeateds.filter((item) => item.stickerCode !== stickerCode),
      );
      return;
    }

    replaceRequestedRepeateds([...draft.requestedRepeateds, { stickerCode, quantity: 1 }]);
  };

  const updateRequestedRepeatedQuantity = (stickerCode: string, quantity: number) => {
    if (lockedRequestedRepeatedCodes.has(stickerCode)) {
      return;
    }

    replaceRequestedRepeateds(
      draft.requestedRepeateds.map((item) =>
        item.stickerCode === stickerCode ? { ...item, quantity } : item,
      ),
    );
  };

  const renderSharedSearch = () => (
    <div className="space-y-1">
      <label htmlFor="proposal-search" className="text-sm font-medium text-foreground">
        Buscar en esta propuesta
      </label>
      <Input
        id="proposal-search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="ARG 7, Argentina, badge..."
      />
      <p className="text-xs text-muted-foreground">
        Usa un solo buscador para encontrar selección, código, número o tipo en cualquier paso.
      </p>
    </div>
  );

  const focusBalance = () => {
    balanceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightBalance(true);
    window.setTimeout(() => setHighlightBalance(false), 1600);
  };

  const openOfferDrawer = (block: ProposalBlock) => {
    setDrawerBlock(structuredClone(block));
    setDrawerExactInput(formatCounterofferCodes(block.counteroffer?.exactStickerCodes ?? []));
    setDrawerError(null);
    setConfirmDiscardCounteroffer(false);
  };

  const closeOfferDrawer = () => {
    setDrawerBlock(null);
    setDrawerExactInput("");
    setDrawerError(null);
    setConfirmDiscardCounteroffer(false);
  };

  const updateDrawerBlock = (updater: (block: ProposalBlock) => ProposalBlock) => {
    setDrawerBlock((current) => (current ? updater(current) : current));
    setDrawerError(null);
  };

  const drawerHasCustomCounteroffer = (block: ProposalBlock | null) => {
    if (block?.mode !== "counteroffer") {
      return false;
    }

    const current = block.counteroffer;
    return Boolean(
      current &&
        (Object.values(current.offers).some((quantity) => quantity > 0) ||
          current.exactStickerCodes.length > 0 ||
          current.note),
    );
  };

  const getBalanceGuidance = () => {
    if (balance.isExact) {
      return {
        tone: "positive" as const,
        summary: "Tu propuesta ya está lista para enviarse.",
        detail: "El intercambio cierra exacto.",
      };
    }

    if (balance.delta > 0) {
      return {
        tone: "warning" as const,
        summary: `Te sobran ${balance.delta} ${balance.delta === 1 ? "unidad" : "unidades"} para enviar.`,
        detail: `Quita ${balance.delta} ${balance.delta === 1 ? "unidad" : "unidades"} de tu oferta o pide ${balance.delta} repetido${balance.delta === 1 ? "" : "s"} más.`,
      };
    }

    const missing = Math.abs(balance.delta);
    return {
      tone: "warning" as const,
      summary: `Te faltan ${missing} ${missing === 1 ? "unidad" : "unidades"} para enviar.`,
      detail: `Añade ${missing} ${missing === 1 ? "unidad" : "unidades"} a tu oferta o reduce ${missing} repetido${missing === 1 ? "" : "s"} pedido${missing === 1 ? "" : "s"}.`,
    };
  };

  const getDrawerPreviewBlock = () => {
    if (!drawerBlock) {
      return null;
    }

    if (drawerBlock.mode !== "counteroffer") {
      return drawerBlock;
    }

    return {
      ...drawerBlock,
      counteroffer: {
        ...(drawerBlock.counteroffer ?? {
          offers: { ...EMPTY_COUNTEROFFER_OFFERS },
          exactStickerCodes: [],
          note: null,
        }),
        exactStickerCodes: resolveExactStickerInput(drawerExactInput).exactStickerCodes,
      },
    } satisfies ProposalBlock;
  };

  const saveDrawerChanges = () => {
    if (!drawerBlock) {
      return;
    }

    const finalizedExactInput = resolveExactStickerInput(drawerExactInput, {
      forceFinalized: true,
    });

    if (drawerBlock.mode === "counteroffer" && finalizedExactInput.issue) {
      setDrawerError(finalizedExactInput.issue.reason);
      return;
    }

    const nextDrawerBlock: ProposalBlock =
      drawerBlock.mode === "counteroffer"
        ? {
            ...drawerBlock,
            counteroffer: {
              ...(drawerBlock.counteroffer ?? {
                offers: { ...EMPTY_COUNTEROFFER_OFFERS },
                exactStickerCodes: [],
                note: null,
              }),
              exactStickerCodes: finalizedExactInput.exactStickerCodes,
            },
          }
        : {
            ...drawerBlock,
            counteroffer: null,
          };

    if (nextDrawerBlock.mode === "counteroffer" && !isCounterofferValid(nextDrawerBlock)) {
      setDrawerError("Agrega una cantidad o escribe al menos un cromo exacto para continuar.");
      return;
    }

    const nextBlocks = draft.blocks.map((block) =>
      block.requestedStickerCode === nextDrawerBlock.requestedStickerCode ? nextDrawerBlock : block,
    );
    const duplicateExactCodes = validateUniqueCounterofferExactStickerCodes(nextBlocks);

    if (!duplicateExactCodes.ok) {
      setDrawerError(duplicateExactCodes.reason);
      return;
    }

    const repeatedValidation = validateExactStickerCodesAgainstAvailableItems(
      finalizedExactInput.exactStickerCodes,
      availableRepeatedItems,
    );

    if (!repeatedValidation.ok) {
      setDrawerError(repeatedValidation.reason);
      return;
    }

    setExactInputByCode((current) => ({
      ...current,
      [nextDrawerBlock.requestedStickerCode]: formatCounterofferCodes(
        finalizedExactInput.exactStickerCodes,
      ),
    }));
    persistDraft({ ...draft, blocks: nextBlocks, updatedAt: new Date().toISOString() });
    closeOfferDrawer();
    window.setTimeout(() => focusBalance(), 120);
  };

  const renderCounterofferEditor = (block: ProposalBlock) => {
    const exactInput =
      exactInputByCode[block.requestedStickerCode] ??
      formatCounterofferCodes(block.counteroffer?.exactStickerCodes ?? []);

    return (
      <div
        data-no-toggle="true"
        className="space-y-3 rounded-xl border border-border bg-background/80 p-4"
      >
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Ajusta tu propuesta para este cromo</p>
          <p className="text-xs text-muted-foreground">
            Puedes mezclar cantidades por tipo o escribir cromos exactos.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Cantidades opcionales por tipo</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["PLAYER", "BADGE", "TEAM_PHOTO", "SPECIAL"] as const).map((offerType) => (
              <div key={offerType} className="space-y-1">
                <label
                  htmlFor={`counteroffer-quantity-${block.requestedStickerCode}-${offerType}`}
                  className="text-sm font-medium text-foreground"
                >
                  {OFFER_TYPE_LABEL[offerType]}
                </label>
                <Input
                  id={`counteroffer-quantity-${block.requestedStickerCode}-${offerType}`}
                  type="number"
                  min={0}
                  value={block.counteroffer?.offers?.[offerType] ?? 0}
                  onChange={(event) => {
                    const quantity = Math.max(0, Number(event.target.value || 0));
                    updateCounterofferBlock(block.requestedStickerCode, (current) => ({
                      ...current,
                      offers: {
                        ...(current.offers ?? EMPTY_COUNTEROFFER_OFFERS),
                        [offerType]: quantity,
                      },
                    }));
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor={`counteroffer-exact-${block.requestedStickerCode}`}
            className="text-sm font-medium text-foreground"
          >
            Cromos exactos opcionales
          </label>
          <Input
            id={`counteroffer-exact-${block.requestedStickerCode}`}
            value={exactInput}
            onChange={(event) => {
              const value = event.target.value.toUpperCase();
              setExactInputByCode((prev) => ({
                ...prev,
                [block.requestedStickerCode]: value,
              }));
              const resolvedExactInput = resolveExactStickerInput(value);
              const exactStickerCodes = resolvedExactInput.exactStickerCodes;
              const nextBlocks = draft.blocks.map((currentBlock) =>
                currentBlock.requestedStickerCode === block.requestedStickerCode
                  ? {
                      ...currentBlock,
                      mode: "counteroffer" as const,
                      modeLabel: getModeLabel("counteroffer"),
                      counteroffer: {
                        ...(currentBlock.counteroffer ?? {
                          offers: { ...EMPTY_COUNTEROFFER_OFFERS },
                          exactStickerCodes: [],
                          note: null,
                        }),
                        exactStickerCodes,
                      },
                    }
                  : currentBlock,
              );
              const duplicateExactCodes = validateUniqueCounterofferExactStickerCodes(nextBlocks);
              const repeatedValidation = validateExactStickerCodesAgainstAvailableItems(
                exactStickerCodes,
                availableRepeatedItems,
              );

              const localError = !duplicateExactCodes.ok
                ? duplicateExactCodes.reason
                : resolvedExactInput.issue?.kind === "invalid"
                  ? resolvedExactInput.issue.reason
                  : !repeatedValidation.ok
                    ? repeatedValidation.reason
                    : null;

              const prevCodes = block.counteroffer?.exactStickerCodes ?? [];
              const newlyAdded = exactStickerCodes.filter((code) => !prevCodes.includes(code));
              for (const code of newlyAdded) {
                if (availableRepeatedItems[code] > 0) {
                  toast.success(
                    `Cromo ${code} agregado automáticamente a tus interesados (Paso 2).`,
                  );
                }
              }

              updateCounterofferBlock(block.requestedStickerCode, (current) => ({
                ...current,
                exactStickerCodes,
              }));

              if (localError) {
                setBlockErrors((current) => ({
                  ...current,
                  [block.requestedStickerCode]: localError,
                }));
                return;
              }

              setBlockErrors((current) => {
                if (!current[block.requestedStickerCode]) {
                  return current;
                }

                const nextErrors = { ...current };
                delete nextErrors[block.requestedStickerCode];
                return nextErrors;
              });
            }}
            onBlur={() => {
              const value = exactInput.trim();
              if (!value) return;

              const resolvedExactInput = resolveExactStickerInput(value, { forceFinalized: true });
              const exactStickerCodes = resolvedExactInput.exactStickerCodes;

              const nextBlocks = draft.blocks.map((currentBlock) =>
                currentBlock.requestedStickerCode === block.requestedStickerCode
                  ? {
                      ...currentBlock,
                      mode: "counteroffer" as const,
                      modeLabel: getModeLabel("counteroffer"),
                      counteroffer: {
                        ...(currentBlock.counteroffer ?? {
                          offers: { ...EMPTY_COUNTEROFFER_OFFERS },
                          exactStickerCodes: [],
                          note: null,
                        }),
                        exactStickerCodes,
                      },
                    }
                  : currentBlock,
              );
              const duplicateExactCodes = validateUniqueCounterofferExactStickerCodes(nextBlocks);
              const repeatedValidation = validateExactStickerCodesAgainstAvailableItems(
                exactStickerCodes,
                availableRepeatedItems,
              );

              const localError = !duplicateExactCodes.ok
                ? duplicateExactCodes.reason
                : resolvedExactInput.issue?.kind === "invalid"
                  ? resolvedExactInput.issue.reason
                  : !repeatedValidation.ok
                    ? repeatedValidation.reason
                    : null;

              const prevCodes = block.counteroffer?.exactStickerCodes ?? [];
              const newlyAdded = exactStickerCodes.filter((code) => !prevCodes.includes(code));
              for (const code of newlyAdded) {
                if (availableRepeatedItems[code] > 0) {
                  toast.success(
                    `Cromo ${code} agregado automáticamente a tus interesados (Paso 2).`,
                  );
                }
              }

              updateCounterofferBlock(block.requestedStickerCode, (current) => ({
                ...current,
                exactStickerCodes,
              }));

              if (localError) {
                setBlockErrors((current) => ({
                  ...current,
                  [block.requestedStickerCode]: localError,
                }));
                return;
              }

              setExactInputByCode((prev) => ({
                ...prev,
                [block.requestedStickerCode]: formatCounterofferCodes(exactStickerCodes),
              }));

              setBlockErrors((current) => {
                if (!current[block.requestedStickerCode]) {
                  return current;
                }

                const nextErrors = { ...current };
                delete nextErrors[block.requestedStickerCode];
                return nextErrors;
              });
            }}
            placeholder="POR-15, ARG-7"
          />
          <p className="text-xs text-muted-foreground">
            Separa varios cromos con coma o espacio. Si completas este campo, puedes continuar
            aunque todas las cantidades queden en 0. Ejemplo: `POR-15 ARG-7`.
          </p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor={`counteroffer-note-${block.requestedStickerCode}`}
            className="text-sm font-medium text-foreground"
          >
            Nota opcional
          </label>
          <textarea
            id={`counteroffer-note-${block.requestedStickerCode}`}
            value={block.counteroffer?.note ?? ""}
            onChange={(event) => {
              const note = event.target.value.trimStart();
              updateCounterofferBlock(block.requestedStickerCode, (current) => ({
                ...current,
                note: note.length > 0 ? note : null,
              }));
            }}
            rows={3}
            maxLength={280}
            className="flex min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder="Explica rapido tu excepcion si hace falta."
          />
        </div>

        {!isCounterofferValid(block) ? (
          <p className="text-xs text-destructive">
            Agrega una cantidad o escribe al menos un cromo exacto para continuar.
          </p>
        ) : null}
      </div>
    );
  };

  const drawerPreviewBlock = getDrawerPreviewBlock();

  useEffect(() => {
    void currentStep;
    void isSubmitted;
    wizardTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentStep, isSubmitted]);

  const renderStepContent = () => {
    if (isSubmitted) {
      return (
        <section className="space-y-4 rounded-2xl border border-border bg-background p-4 shadow-sm">
          <div className="space-y-2">
            <Badge className="bg-brand text-brand-foreground">Pendiente de aprobacion</Badge>
            <h2 className="font-display text-2xl text-foreground">Propuesta enviada</h2>
            <p className="text-sm text-muted-foreground">
              El coleccionista verá primero los cromos que necesita, luego lo que quieres recibir y
              después tu propuesta por bloque.
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-medium text-foreground">Quieres recibir del coleccionista</p>
            <div className="flex flex-wrap gap-2">
              {visibleRequestedRepeateds.map((item) => (
                <Badge key={item.stickerCode} variant="secondary">
                  {item.stickerCode} x{item.quantity}
                </Badge>
              ))}
            </div>
          </div>

          {visibleSelectedBlocks.map((block) => (
            <article
              key={block.requestedStickerCode}
              className="space-y-3 rounded-xl border border-border p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground">{block.requestedStickerCode}</p>
                <Badge variant="secondary">{block.requestedStickerLabel}</Badge>
                <Badge variant={block.mode === "counteroffer" ? "outline" : "secondary"}>
                  {block.modeLabel}
                </Badge>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Recibe el coleccionista: {block.requestedStickerCode}</p>
                {block.mode === "fulfill" ? (
                  <RuleOptions block={block} title="Se cambia por una de estas opciones" />
                ) : (
                  <p>Ofreces: {getCounterofferSummary(block)}</p>
                )}
                {block.rule.exactStickerCode ? (
                  <p>Regla exacta visible: {block.rule.exactStickerCode}</p>
                ) : null}
                {block.counteroffer?.note ? <p>Nota: {block.counteroffer.note}</p> : null}
              </div>
            </article>
          ))}
        </section>
      );
    }

    if (currentStep === 1) {
      return (
        <section className="space-y-4 rounded-2xl border border-border bg-background p-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="font-display text-2xl text-foreground">Paso 1: elige qué le ofreces</h2>
            <p className="text-sm text-muted-foreground">
              Selecciona los cromos que sí puedes darle al coleccionista. Si quieres personalizar
              una oferta, abre su panel desde `Proponer otra opción`.
            </p>
          </div>

          {renderSharedSearch()}

          <div className="space-y-3">
            {visibleRequestedStickers.length === 0 ? (
              <StepEmptyState message="No hay cromos visibles para esa búsqueda." />
            ) : null}
            {visibleRequestedStickers.map((sticker) => {
              const isSelected = draft.selectedStickerCodes.includes(sticker.code);
              const isExpanded = expandedCounterofferCodes.includes(sticker.code);
              const block =
                blocksByCode.get(sticker.code) ??
                buildProposalBlock(sticker.code, globalSettings, overrides);
              return (
                <article
                  key={sticker.code}
                  ref={(el) => {
                    if (el) blockRefs.current.set(sticker.code, el);
                    else blockRefs.current.delete(sticker.code);
                  }}
                  className={cn(
                    "space-y-4 rounded-xl border p-4 transition",
                    blockErrors[sticker.code]
                      ? "border-destructive/50 bg-destructive/5"
                      : isSelected
                        ? "border-primary/40 bg-primary/10"
                        : "border-border bg-background",
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      "w-full space-y-2 text-left",
                      !isSelected
                        ? "cursor-pointer rounded-lg hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        : "rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    )}
                    onClick={() => toggleSticker(sticker.code)}
                  >
                    <span className="text-sm font-semibold text-foreground">{sticker.code}</span>
                    {block ? (
                      <RuleOptions
                        block={block}
                        title="Por este cambio obtendrás una de estas opciones:"
                      />
                    ) : null}

                    {isSelected && block.mode === "counteroffer" ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Contraoferta</Badge>
                      </div>
                    ) : null}

                    {isSelected && block.mode === "counteroffer" ? (
                      <p className="text-sm text-muted-foreground">
                        Ofreces: {getCounterofferSummary(block)}
                      </p>
                    ) : null}
                  </button>

                  <div className="flex w-full flex-wrap items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleSticker(sticker.code);
                      }}
                    >
                      {isSelected ? "Quitar" : "Lo puedo ofrecer"}
                    </Button>

                    {isSelected ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (block.mode === "counteroffer" && isExpanded) {
                            clearCounteroffer(sticker.code);
                            return;
                          }

                          if (block.mode === "counteroffer") {
                            toggleCounterofferPanel(sticker.code);
                            return;
                          }

                          toggleCounterofferPanel(sticker.code);
                        }}
                      >
                        {block.mode === "counteroffer"
                          ? isExpanded
                            ? "Eliminar propuesta"
                            : "Editar propuesta"
                          : "Proponer otra opción"}
                      </Button>
                    ) : null}
                  </div>

                  {isSelected && isExpanded ? renderCounterofferEditor(block) : null}

                  {blockErrors[sticker.code] ? (
                    <p className="text-sm font-medium text-destructive">
                      {blockErrors[sticker.code]}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      );
    }

    if (currentStep === 2) {
      return (
        <section className="space-y-4 rounded-2xl border border-border bg-background p-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="font-display text-2xl text-foreground">
              Paso 2: elige qué quieres recibir
            </h2>
            <p className="text-sm text-muted-foreground">
              Estos son los repetidos disponibles del coleccionista. Selecciona los que te
              interesan.
            </p>
          </div>

          {renderSharedSearch()}

          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Tú recibirías del coleccionista</p>
              <p className="text-sm text-muted-foreground">
                Estos son sus repetidos disponibles. Selecciona los que te interesan.
              </p>
            </div>

            <div className="space-y-3">
              {visibleAvailableRepeatedStickers.length === 0 ? (
                <StepEmptyState message="No hay repetidos visibles para esa búsqueda." />
              ) : null}
              {visibleAvailableRepeatedStickers.map((sticker) => {
                const selected = draft.requestedRepeateds.find(
                  (item) => item.stickerCode === sticker.code,
                );
                const isLocked = lockedRequestedRepeatedCodes.has(sticker.code);
                const quantity = selected?.quantity ?? 1;

                return (
                  <article
                    key={sticker.code}
                    className={cn(
                      "space-y-3 rounded-xl border p-4 transition",
                      isLocked
                        ? "border-primary/25 bg-primary/5"
                        : selected
                          ? "border-primary/40 bg-primary/10"
                          : "border-border bg-background",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 flex-col gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        onClick={() => toggleRequestedRepeated(sticker.code)}
                        disabled={isLocked}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {sticker.code}
                          </span>
                          <Badge variant="secondary">{sticker.groupName}</Badge>
                          <Badge variant="secondary">{STICKER_TYPE_LABEL[sticker.type]}</Badge>
                          <Badge variant="secondary">Disponible x{sticker.availableQuantity}</Badge>
                          {isLocked ? <Badge variant="outline">Incluido desde paso 1</Badge> : null}
                        </div>
                        <p className="text-sm text-muted-foreground">{sticker.label}</p>
                        {isLocked ? (
                          <p className="text-xs text-muted-foreground">
                            Este cromo ya forma parte de una contraoferta exacta y queda marcado
                            automaticamente.
                          </p>
                        ) : null}
                      </button>

                      <Button
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        onClick={() => toggleRequestedRepeated(sticker.code)}
                        disabled={isLocked}
                      >
                        {isLocked ? "Incluido" : selected ? "Ya me interesa" : "Me interesa"}
                      </Button>
                    </div>

                    {selected ? (
                      <div className="space-y-1">
                        <label
                          htmlFor={`requested-repeated-${sticker.code}`}
                          className="text-sm font-medium text-foreground"
                        >
                          Cantidad solicitada
                        </label>
                        <Input
                          id={`requested-repeated-${sticker.code}`}
                          type="number"
                          min={1}
                          max={sticker.availableQuantity}
                          value={quantity}
                          disabled={isLocked}
                          onChange={(event) => {
                            const nextQuantity = Math.min(
                              sticker.availableQuantity,
                              Math.max(1, Number(event.target.value || 1)),
                            );
                            updateRequestedRepeatedQuantity(sticker.code, nextQuantity);
                          }}
                        />
                        {isLocked ? (
                          <p className="text-xs text-muted-foreground">
                            La cantidad queda fija en `1` mientras este cromo siga referenciado en
                            una contraoferta.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      );
    }

    const balanceGuidance = getBalanceGuidance();

    return (
      <section className="space-y-4 rounded-2xl border border-border bg-background p-4 shadow-sm">
        <div className="space-y-1">
          <h2 className="font-display text-2xl text-foreground">Paso 3: revisa antes de enviar</h2>
          <p className="text-sm text-muted-foreground">
            Confirma lo que recibe el coleccionista y lo que recibirías tú.
          </p>
        </div>

        <section
          ref={balanceRef}
          className={cn(
            "space-y-3 rounded-xl border p-4 transition",
            highlightBalance && "ring-2 ring-primary/30",
            balance.isExact
              ? "border-primary/30 bg-primary/5"
              : "border-destructive/40 bg-destructive/5",
          )}
        >
          <p className="text-sm font-medium text-foreground">Balance del intercambio</p>
          <p className="text-sm text-muted-foreground">
            El coleccionista recibe {balance.offeredUnits} unidad
            {balance.offeredUnits === 1 ? "" : "es"}. Tú recibes {balance.requestedUnits} unidad
            {balance.requestedUnits === 1 ? "" : "es"}.
          </p>
          <div className="space-y-1">
            <p
              className={cn(
                "text-sm font-medium",
                balance.isExact ? "text-foreground" : "text-destructive",
              )}
            >
              {balanceGuidance.summary}
            </p>
            <p className="text-sm text-muted-foreground">{balanceGuidance.detail}</p>
          </div>
        </section>

        {renderSharedSearch()}

        <section
          ref={repeatedsSectionRef}
          className="space-y-3 rounded-xl border border-border bg-background p-4"
        >
          <p className="text-sm font-medium text-foreground">Tú recibes</p>
          {visibleRequestedRepeateds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No has seleccionado repetidos para ti.</p>
          ) : (
            <div className="space-y-3">
              {visibleRequestedRepeateds.map((item) => {
                const sticker = availableRepeatedByCode.get(item.stickerCode);
                const isLocked = lockedRequestedRepeatedCodes.has(item.stickerCode);

                return (
                  <div
                    key={item.stickerCode}
                    className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{item.stickerCode}</p>
                      <Badge variant="secondary">x{item.quantity}</Badge>
                      {isLocked ? <Badge variant="outline">Incluido desde paso 1</Badge> : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isLocked || item.quantity <= 1}
                        onClick={() =>
                          updateRequestedRepeatedQuantity(item.stickerCode, item.quantity - 1)
                        }
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={sticker?.availableQuantity ?? item.quantity}
                        value={item.quantity}
                        disabled={isLocked}
                        onChange={(event) => {
                          const maxAvailable = sticker?.availableQuantity ?? item.quantity;
                          const nextQuantity = Math.min(
                            maxAvailable,
                            Math.max(1, Number(event.target.value || 1)),
                          );
                          updateRequestedRepeatedQuantity(item.stickerCode, nextQuantity);
                        }}
                        className="w-20"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={
                          isLocked || item.quantity >= (sticker?.availableQuantity ?? item.quantity)
                        }
                        onClick={() =>
                          updateRequestedRepeatedQuantity(item.stickerCode, item.quantity + 1)
                        }
                      >
                        +
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={isLocked}
                        onClick={() => toggleRequestedRepeated(item.stickerCode)}
                      >
                        Quitar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section
          ref={offersSectionRef}
          className="space-y-3 rounded-xl border border-border bg-background p-4"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Tú das</p>
            <p className="text-sm text-muted-foreground">
              Revisa bloque por bloque qué estás ofreciendo al coleccionista.
            </p>
          </div>
          {visibleSelectedBlocks.length === 0 ? (
            <StepEmptyState message="No hay bloques visibles para esa búsqueda." />
          ) : null}
          {visibleSelectedBlocks.map((block) => (
            <article
              key={block.requestedStickerCode}
              ref={(el) => {
                if (el) blockRefs.current.set(block.requestedStickerCode, el);
                else blockRefs.current.delete(block.requestedStickerCode);
              }}
              className={cn(
                "space-y-2 rounded-xl border p-4",
                blockErrors[block.requestedStickerCode]
                  ? "border-destructive/50 bg-destructive/5"
                  : "border-border",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground">{block.requestedStickerCode}</p>
                <Badge variant={block.mode === "counteroffer" ? "outline" : "secondary"}>
                  {block.modeLabel}
                </Badge>
                <Badge variant="secondary">
                  {getProposalBlockCapacity(block)} unidad
                  {getProposalBlockCapacity(block) === 1 ? "" : "es"}
                </Badge>
              </div>
              {block.mode === "fulfill" ? (
                <RuleOptions block={block} title="Se cambia por una de estas opciones" />
              ) : (
                <p className="text-sm text-muted-foreground">{getCounterofferSummary(block)}</p>
              )}
              {block.counteroffer?.note ? (
                <p className="text-xs text-muted-foreground">Nota: {block.counteroffer.note}</p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openOfferDrawer(block)}
                >
                  Editar oferta
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => toggleSticker(block.requestedStickerCode)}
                >
                  Quitar
                </Button>
              </div>
              {blockErrors[block.requestedStickerCode] ? (
                <p className="text-sm font-medium text-destructive">
                  {blockErrors[block.requestedStickerCode]}
                </p>
              ) : null}
            </article>
          ))}
        </section>
      </section>
    );
  };

  return (
    <div ref={wizardTopRef} className="space-y-4">
      <section className="space-y-3 rounded-2xl border border-border bg-background p-4 shadow-sm">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Sesion activa</p>
          <h2 className="font-display text-2xl text-foreground">Hola, {cambiadorName}</h2>
          <p className="text-sm text-muted-foreground">
            Prepara tu propuesta de forma rápida desde el móvil. Cada cromo se negocia por separado.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STEP_LABELS.map((label, index) => {
            const stepNumber = index + 1;
            const isActive = currentStep === stepNumber;
            const isDone = currentStep > stepNumber || isSubmitted;
            return (
              <div
                key={label}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs",
                  isActive
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : isDone
                      ? "border-border bg-muted/50 text-muted-foreground"
                      : "border-border bg-background text-muted-foreground",
                )}
              >
                <div className="mb-1 flex items-center gap-2">
                  {isDone ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <CircleDashed className="size-3.5" />
                  )}
                  <span>{label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {feedback ? <p className="text-xs text-muted-foreground">{feedback}</p> : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </section>

      {renderStepContent()}

      {!isSubmitted ? (
        <div className="sticky bottom-4 z-20 rounded-2xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {draft.selectedStickerCodes.length} cromos seleccionados
              </p>
              <p className="text-xs text-muted-foreground">
                {decisionSummary.fulfill} cumplen regla · {decisionSummary.counteroffer}{" "}
                contraofertas · {countRequestedRepeateds(draft.requestedRepeateds)} repetidos para
                ti
              </p>
            </div>

            <div className="flex gap-2 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                disabled={isPending || currentStep === 1}
                onClick={() => updateStep(Math.max(1, currentStep - 1))}
              >
                <ChevronLeft />
                Volver
              </Button>

              {currentStep < 3 ? (
                <Button
                  type="button"
                  disabled={isPending || !canContinueFromStep}
                  onClick={() => continueToStep(Math.min(3, currentStep + 1))}
                >
                  Continuar
                  <ChevronRight />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={
                    isPending ||
                    !draft.blocks.every((block) => isCounterofferValid(block)) ||
                    !balance.isExact
                  }
                  onClick={() =>
                    persistDraft(
                      { ...draft, status: "pending", submittedAt: new Date().toISOString() },
                      true,
                    )
                  }
                >
                  Enviar propuesta
                  <Send />
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <Dialog
        open={Boolean(drawerBlock)}
        onOpenChange={(open) => (!open ? closeOfferDrawer() : null)}
      >
        {drawerBlock ? (
          <DialogContent
            showCloseButton={false}
            className="top-auto bottom-0 left-0 w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-2xl sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2"
          >
            <DialogHeader>
              <DialogTitle>Editar oferta de {drawerBlock.requestedStickerCode}</DialogTitle>
              <DialogDescription>Regla actual: {summarizeRule(drawerBlock)}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Modo del bloque</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant={drawerBlock.mode === "fulfill" ? "default" : "outline"}
                    onClick={() => {
                      if (drawerHasCustomCounteroffer(drawerBlock)) {
                        setConfirmDiscardCounteroffer(true);
                        return;
                      }

                      updateDrawerBlock((current) => ({
                        ...current,
                        mode: "fulfill",
                        modeLabel: getModeLabel("fulfill"),
                        counteroffer: null,
                      }));
                    }}
                  >
                    Acepta la regla
                  </Button>
                  <Button
                    type="button"
                    variant={drawerBlock.mode === "counteroffer" ? "default" : "outline"}
                    onClick={() =>
                      updateDrawerBlock((current) => ({
                        ...current,
                        mode: "counteroffer",
                        modeLabel: getModeLabel("counteroffer"),
                        counteroffer: current.counteroffer ?? {
                          offers: { ...EMPTY_COUNTEROFFER_OFFERS },
                          exactStickerCodes: [],
                          note: null,
                        },
                      }))
                    }
                  >
                    Propone otra opción
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="text-sm font-medium text-foreground">
                  Este bloque habilita {getProposalBlockCapacity(drawerPreviewBlock ?? drawerBlock)}{" "}
                  unidad
                  {getProposalBlockCapacity(drawerPreviewBlock ?? drawerBlock) === 1 ? "" : "es"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {drawerBlock.mode === "fulfill"
                    ? "La capacidad sale automáticamente de la regla aceptada."
                    : "La capacidad suma todas las cantidades por tipo y cada cromo exacto opcional."}
                </p>
              </div>

              {confirmDiscardCounteroffer ? (
                <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
                  <p className="text-sm font-medium text-foreground">
                    Volver a aceptar la regla eliminará esta contraoferta personalizada.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmDiscardCounteroffer(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setConfirmDiscardCounteroffer(false);
                        updateDrawerBlock((current) => ({
                          ...current,
                          mode: "fulfill",
                          modeLabel: getModeLabel("fulfill"),
                          counteroffer: null,
                        }));
                        setDrawerExactInput("");
                      }}
                    >
                      Volver a aceptar
                    </Button>
                  </div>
                </div>
              ) : null}

              {drawerBlock.mode === "fulfill" ? (
                <RuleOptions
                  block={drawerBlock}
                  title="La regla se puede cumplir con una de estas opciones"
                />
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Cantidades por tipo</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(["PLAYER", "BADGE", "TEAM_PHOTO", "SPECIAL"] as const).map((offerType) => (
                        <div key={offerType} className="space-y-1">
                          <label
                            htmlFor={`drawer-counteroffer-quantity-${offerType}`}
                            className="text-sm font-medium text-foreground"
                          >
                            {OFFER_TYPE_LABEL[offerType]}
                          </label>
                          <Input
                            id={`drawer-counteroffer-quantity-${offerType}`}
                            type="number"
                            min={0}
                            value={drawerBlock.counteroffer?.offers?.[offerType] ?? 0}
                            onChange={(event) => {
                              const quantity = Math.max(0, Number(event.target.value || 0));
                              updateDrawerBlock((current) => ({
                                ...current,
                                counteroffer: {
                                  ...(current.counteroffer ?? {
                                    offers: { ...EMPTY_COUNTEROFFER_OFFERS },
                                    exactStickerCodes: [],
                                    note: null,
                                  }),
                                  offers: {
                                    ...((current.counteroffer?.offers ??
                                      EMPTY_COUNTEROFFER_OFFERS) as Record<OfferType, number>),
                                    [offerType]: quantity,
                                  },
                                },
                              }));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="drawer-counteroffer-exact"
                      className="text-sm font-medium text-foreground"
                    >
                      Cromos exactos opcionales
                    </label>
                    <Input
                      id="drawer-counteroffer-exact"
                      value={drawerExactInput}
                      onChange={(event) => {
                        setDrawerExactInput(event.target.value.toUpperCase());
                        setDrawerError(null);
                      }}
                      placeholder="POR-15, ARG-7"
                    />
                    <p className="text-xs text-muted-foreground">
                      Separa varios cromos con coma o espacio. Cada cromo exacto suma 1 unidad.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="drawer-counteroffer-note"
                      className="text-sm font-medium text-foreground"
                    >
                      Nota opcional
                    </label>
                    <textarea
                      id="drawer-counteroffer-note"
                      value={drawerBlock.counteroffer?.note ?? ""}
                      onChange={(event) => {
                        const note = event.target.value.trimStart();
                        updateDrawerBlock((current) => ({
                          ...current,
                          counteroffer: {
                            ...(current.counteroffer ?? {
                              offers: { ...EMPTY_COUNTEROFFER_OFFERS },
                              exactStickerCodes: [],
                              note: null,
                            }),
                            note: note.length > 0 ? note : null,
                          },
                        }));
                      }}
                      rows={3}
                      maxLength={280}
                      className="flex min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      placeholder="Explica rápido tu excepción si hace falta."
                    />
                  </div>
                </div>
              )}

              {drawerError ? <p className="text-sm text-destructive">{drawerError}</p> : null}
            </div>

            <DialogFooter showCloseButton={false}>
              <Button type="button" variant="outline" onClick={closeOfferDrawer}>
                Cancelar
              </Button>
              <Button type="button" onClick={saveDrawerChanges}>
                Guardar cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
