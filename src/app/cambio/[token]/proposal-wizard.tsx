"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, Send } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StickerType } from "@/lib/album-catalog";
import {
  type AvailableRepeatedSticker,
  buildEmptyProposal,
  buildProposalBlock,
  countRequestedRepeateds,
  filterRequestedStickers,
  formatCounterofferCodes,
  getDecisionSummary,
  getModeLabel,
  isCounterofferValid,
  normalizeProposalDraft,
  normalizeRequestedRepeateds,
  parseExactStickerCodes,
  type RequestedSticker,
  summarizeRule,
  syncProposalBlocks,
} from "@/lib/cambio-proposal";
import {
  type ExchangeSettings,
  formatExchangeRuleOptions,
  type OfferType,
  type StickerOverride,
} from "@/lib/exchange-settings";
import { matchesFlexibleSearch } from "@/lib/search";
import type { ProposalBlock, SessionProposal } from "@/lib/sessions";
import { cn } from "@/lib/utils";
import { saveCambioProposalDraftAction, submitCambioProposalAction } from "./actions";

const STEP_LABELS = [
  "1. Elige qué ofreces",
  "2. Decide",
  "3. Ajusta tu propuesta",
  "4. Elige qué quieres recibir",
  "5. Revisa y envía",
] as const;

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
    requestedRepeateds: normalizeRequestedRepeateds(
      draft.requestedRepeateds,
      availableRepeatedItems,
    ),
  };
}

function renderRequirementList(block: ProposalBlock) {
  const options = formatExchangeRuleOptions(block.rule.abstract);
  return options.length > 0 ? options.join(" o ") : "Sin opciones de intercambio";
}

function getCounterofferSummary(block: ProposalBlock): string {
  const counteroffer = block.counteroffer;
  if (!counteroffer) return "Sin contraoferta";

  const parts: string[] = [];
  if (counteroffer.quantity > 0) {
    parts.push(`${counteroffer.quantity} ${OFFER_TYPE_LABEL[counteroffer.offerType]}`);
  }
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
  const [exactInputByCode, setExactInputByCode] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (initialProposal?.blocks ?? []).map((block) => [
        block.requestedStickerCode,
        formatCounterofferCodes(block.counteroffer?.exactStickerCodes ?? []),
      ]),
    ),
  );
  const [isPending, startTransition] = useTransition();

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

  const persistDraft = (nextDraft: SessionProposal, submit = false) => {
    setDraft(nextDraft);
    setError(null);
    setFeedback(submit ? "Enviando propuesta..." : "Guardando borrador...");

    startTransition(async () => {
      try {
        const saved = submit
          ? await submitCambioProposalAction({ token, sessionId, proposal: nextDraft })
          : await saveCambioProposalDraftAction({ token, sessionId, proposal: nextDraft });

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
      requestedRepeateds: normalizeRequestedRepeateds(requestedRepeateds, availableRepeatedItems),
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleSticker = (stickerCode: string) => {
    const selected = new Set(draft.selectedStickerCodes);
    if (selected.has(stickerCode)) {
      selected.delete(stickerCode);
    } else {
      selected.add(stickerCode);
    }

    replaceSelectedStickers(Array.from(selected).sort(), draft.currentStep);
  };

  const updateStep = (currentStep: number) => {
    persistDraft({ ...draft, currentStep, updatedAt: new Date().toISOString() });
  };

  const updateBlock = (stickerCode: string, updater: (block: ProposalBlock) => ProposalBlock) => {
    const nextBlocks = draft.blocks.map((block) =>
      block.requestedStickerCode === stickerCode ? updater(block) : block,
    );

    persistDraft({ ...draft, blocks: nextBlocks, updatedAt: new Date().toISOString() });
  };

  const currentStep = isSubmitted ? 5 : draft.currentStep;
  const canContinueFromStep =
    currentStep === 1
      ? draft.selectedStickerCodes.length > 0
      : currentStep === 3
        ? draft.blocks.every((block) => isCounterofferValid(block))
        : currentStep === 4
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
      block.rule.label,
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
                <Badge variant="secondary">{block.rule.label}</Badge>
                <Badge variant={block.mode === "counteroffer" ? "outline" : "secondary"}>
                  {block.modeLabel}
                </Badge>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Recibe el coleccionista: {block.requestedStickerCode}</p>
                <p>
                  Ofreces:{" "}
                  {block.mode === "fulfill"
                    ? renderRequirementList(block)
                    : getCounterofferSummary(block)}
                </p>
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
              Selecciona los cromos que sí puedes darle al coleccionista. Aquí mismo verás qué pide
              por cada uno.
            </p>
          </div>

          {renderSharedSearch()}

          <div className="space-y-3">
            {visibleRequestedStickers.length === 0 ? (
              <StepEmptyState message="No hay cromos visibles para esa búsqueda." />
            ) : null}
            {visibleRequestedStickers.map((sticker) => {
              const isSelected = draft.selectedStickerCodes.includes(sticker.code);
              const block =
                blocksByCode.get(sticker.code) ??
                buildProposalBlock(sticker.code, globalSettings, overrides);
              return (
                <button
                  key={sticker.code}
                  type="button"
                  onClick={() => toggleSticker(sticker.code)}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition",
                    isSelected
                      ? "border-primary/40 bg-primary/10"
                      : "border-border bg-background hover:border-primary/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {sticker.code}
                        </span>
                        <Badge variant="secondary">{sticker.groupName}</Badge>
                        <Badge variant="secondary">{STICKER_TYPE_LABEL[sticker.type]}</Badge>
                        {block ? <Badge variant="secondary">{block.rule.label}</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{sticker.label}</p>
                      {block ? (
                        <p className="text-xs text-muted-foreground">{summarizeRule(block)}</p>
                      ) : null}
                    </div>
                    <Badge
                      className={
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {isSelected ? "Seleccionado" : "Agregar"}
                    </Badge>
                  </div>
                </button>
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
              Paso 2: ¿aceptas la regla o propones otra opción?
            </h2>
            <p className="text-sm text-muted-foreground">
              Para cada cromo, decide si aceptas la regla tal cual o si prefieres proponer otra
              opción.
            </p>
          </div>

          {renderSharedSearch()}

          {visibleSelectedBlocks.length === 0 ? (
            <StepEmptyState message="No hay cromos seleccionados visibles para esa búsqueda." />
          ) : null}
          {visibleSelectedBlocks.map((block) => (
            <article
              key={block.requestedStickerCode}
              className="space-y-3 rounded-xl border border-border p-4"
            >
              <div className="space-y-1">
                <p className="font-semibold text-foreground">{block.requestedStickerCode}</p>
                <p className="text-sm text-muted-foreground">
                  {block.requestedStickerLabel} · {block.rule.label}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["fulfill", "counteroffer"] as const).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={block.mode === mode ? "default" : "outline"}
                    className="justify-start"
                    onClick={() =>
                      updateBlock(block.requestedStickerCode, (current) => ({
                        ...current,
                        mode,
                        modeLabel: getModeLabel(mode),
                        counteroffer:
                          mode === "counteroffer"
                            ? (current.counteroffer ?? {
                                quantity: 0,
                                offerType: "PLAYER",
                                exactStickerCodes: [],
                                note: null,
                              })
                            : null,
                      }))
                    }
                  >
                    {mode === "fulfill" ? "Aceptar la regla" : "Proponer otra opción"}
                  </Button>
                ))}
              </div>
            </article>
          ))}
        </section>
      );
    }

    if (currentStep === 3) {
      return (
        <section className="space-y-4 rounded-2xl border border-border bg-background p-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="font-display text-2xl text-foreground">Paso 3: ajusta tu propuesta</h2>
            <p className="text-sm text-muted-foreground">
              Completa solo los cromos en los que has propuesto una alternativa.
            </p>
          </div>

          {renderSharedSearch()}

          {visibleSelectedBlocks.length === 0 ? (
            <StepEmptyState message="No hay bloques visibles para esa búsqueda." />
          ) : null}
          {visibleSelectedBlocks.map((block) => {
            const exactInput =
              exactInputByCode[block.requestedStickerCode] ??
              formatCounterofferCodes(block.counteroffer?.exactStickerCodes ?? []);

            return (
              <article
                key={block.requestedStickerCode}
                className="space-y-3 rounded-xl border border-border p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{block.requestedStickerCode}</p>
                  <Badge variant="secondary">{block.modeLabel}</Badge>
                  <Badge variant="secondary">{block.rule.label}</Badge>
                </div>

                {block.mode === "fulfill" ? (
                  <div className="rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                    Aceptas una de estas opciones: {renderRequirementList(block)}.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-[110px_1fr]">
                      <div className="space-y-1">
                        <label
                          htmlFor={`counteroffer-quantity-${block.requestedStickerCode}`}
                          className="text-sm font-medium text-foreground"
                        >
                          Cantidad
                        </label>
                        <Input
                          id={`counteroffer-quantity-${block.requestedStickerCode}`}
                          type="number"
                          min={0}
                          value={block.counteroffer?.quantity ?? 0}
                          onChange={(event) => {
                            const quantity = Math.max(0, Number(event.target.value || 0));
                            updateBlock(block.requestedStickerCode, (current) => ({
                              ...current,
                              counteroffer: {
                                quantity,
                                offerType: current.counteroffer?.offerType ?? "PLAYER",
                                exactStickerCodes: current.counteroffer?.exactStickerCodes ?? [],
                                note: current.counteroffer?.note ?? null,
                              },
                            }));
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Tipo</p>
                        <div className="flex flex-wrap gap-2">
                          {(["PLAYER", "BADGE", "TEAM_PHOTO", "SPECIAL", "ANY"] as const).map(
                            (offerType) => (
                              <Button
                                key={offerType}
                                type="button"
                                size="sm"
                                variant={
                                  block.counteroffer?.offerType === offerType
                                    ? "default"
                                    : "outline"
                                }
                                onClick={() =>
                                  updateBlock(block.requestedStickerCode, (current) => ({
                                    ...current,
                                    counteroffer: {
                                      quantity: current.counteroffer?.quantity ?? 0,
                                      offerType,
                                      exactStickerCodes:
                                        current.counteroffer?.exactStickerCodes ?? [],
                                      note: current.counteroffer?.note ?? null,
                                    },
                                  }))
                                }
                              >
                                {OFFER_TYPE_LABEL[offerType]}
                              </Button>
                            ),
                          )}
                        </div>
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
                          updateBlock(block.requestedStickerCode, (current) => ({
                            ...current,
                            counteroffer: {
                              quantity: current.counteroffer?.quantity ?? 0,
                              offerType: current.counteroffer?.offerType ?? "PLAYER",
                              exactStickerCodes: parseExactStickerCodes(value),
                              note: current.counteroffer?.note ?? null,
                            },
                          }));
                        }}
                        placeholder="POR-15, ARG-7"
                      />
                      <p className="text-xs text-muted-foreground">
                        Separa varios cromos con coma o espacio. Ejemplo: `POR-15 ARG-7`.
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
                          updateBlock(block.requestedStickerCode, (current) => ({
                            ...current,
                            counteroffer: {
                              quantity: current.counteroffer?.quantity ?? 0,
                              offerType: current.counteroffer?.offerType ?? "PLAYER",
                              exactStickerCodes: current.counteroffer?.exactStickerCodes ?? [],
                              note: note.length > 0 ? note : null,
                            },
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
                        Agrega una cantidad o al menos un cromo exacto para continuar.
                      </p>
                    ) : null}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      );
    }

    if (currentStep === 4) {
      return (
        <section className="space-y-4 rounded-2xl border border-border bg-background p-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="font-display text-2xl text-foreground">
              Paso 4: elige qué quieres recibir
            </h2>
            <p className="text-sm text-muted-foreground">
              Estos son los repetidos disponibles del coleccionista. Selecciona los que te
              interesan.
            </p>
          </div>

          {renderSharedSearch()}

          <div className="space-y-3">
            {visibleAvailableRepeatedStickers.length === 0 ? (
              <StepEmptyState message="No hay repetidos visibles para esa búsqueda." />
            ) : null}
            {visibleAvailableRepeatedStickers.map((sticker) => {
              const selected = draft.requestedRepeateds.find(
                (item) => item.stickerCode === sticker.code,
              );
              const quantity = selected?.quantity ?? 1;

              return (
                <article
                  key={sticker.code}
                  className={cn(
                    "space-y-3 rounded-xl border p-4 transition",
                    selected ? "border-primary/40 bg-primary/10" : "border-border bg-background",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {sticker.code}
                        </span>
                        <Badge variant="secondary">{sticker.groupName}</Badge>
                        <Badge variant="secondary">{STICKER_TYPE_LABEL[sticker.type]}</Badge>
                        <Badge variant="secondary">Disponible x{sticker.availableQuantity}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{sticker.label}</p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      onClick={() => toggleRequestedRepeated(sticker.code)}
                    >
                      {selected ? "Seleccionado" : "Agregar"}
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
                        onChange={(event) => {
                          const nextQuantity = Math.min(
                            sticker.availableQuantity,
                            Math.max(1, Number(event.target.value || 1)),
                          );
                          updateRequestedRepeatedQuantity(sticker.code, nextQuantity);
                        }}
                      />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      );
    }

    return (
      <section className="space-y-4 rounded-2xl border border-border bg-background p-4 shadow-sm">
        <div className="space-y-1">
          <h2 className="font-display text-2xl text-foreground">Paso 5: revisa antes de enviar</h2>
          <p className="text-sm text-muted-foreground">
            Confirma lo que recibe el coleccionista y lo que recibirías tú.
          </p>
        </div>

        {renderSharedSearch()}

        <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium text-foreground">Recibe el coleccionista</p>
          <div className="flex flex-wrap gap-2">
            {visibleSelectedBlocks.map((block) => (
              <Badge
                key={block.requestedStickerCode}
                className="bg-primary text-primary-foreground"
              >
                {block.requestedStickerCode}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-medium text-foreground">Recibes del coleccionista</p>
          {visibleRequestedRepeateds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No has seleccionado repetidos para ti.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {visibleRequestedRepeateds.map((item) => (
                <Badge key={item.stickerCode} variant="secondary">
                  {item.stickerCode} x{item.quantity}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {visibleSelectedBlocks.length === 0 ? (
            <StepEmptyState message="No hay bloques visibles para esa búsqueda." />
          ) : null}
          {visibleSelectedBlocks.map((block) => (
            <article
              key={block.requestedStickerCode}
              className="space-y-2 rounded-xl border border-border p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground">{block.requestedStickerCode}</p>
                <Badge variant="secondary">{block.rule.label}</Badge>
                <Badge variant={block.mode === "counteroffer" ? "outline" : "secondary"}>
                  {block.modeLabel}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {block.mode === "fulfill"
                  ? `Aceptas una de estas opciones: ${renderRequirementList(block)}`
                  : getCounterofferSummary(block)}
              </p>
              {block.counteroffer?.note ? (
                <p className="text-xs text-muted-foreground">Nota: {block.counteroffer.note}</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-2xl border border-border bg-background p-4 shadow-sm">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Sesion activa</p>
          <h2 className="font-display text-2xl text-foreground">Hola, {cambiadorName}</h2>
          <p className="text-sm text-muted-foreground">
            Prepara tu propuesta de forma rápida desde el móvil. Cada cromo se negocia por separado.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
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

              {currentStep < 5 ? (
                <Button
                  type="button"
                  disabled={isPending || !canContinueFromStep}
                  onClick={() => updateStep(Math.min(5, currentStep + 1))}
                >
                  Continuar
                  <ChevronRight />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isPending || !draft.blocks.every((block) => isCounterofferValid(block))}
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
    </div>
  );
}
