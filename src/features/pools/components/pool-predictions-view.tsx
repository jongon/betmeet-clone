"use client";

import { Undo2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resetPredictionOverride } from "@/features/predictions/actions/reset-prediction-override";
import { savePrediction } from "@/features/predictions/actions/save-prediction";
import { PredictionScoreControls } from "@/features/predictions/components/prediction-score-controls";
import { useDictionary, useLocale } from "@/i18n/dictionary-provider";
import type { PoolPredictionsViewProps } from "../types";
import type { MemberPredictionRow } from "./pool-predictions-view-helpers";
import { buildDayGroups, type MatchColumn, paginateDays } from "./pool-predictions-view-helpers";

function subscribeToTimeZone() {
  return () => {};
}

function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function formatKickoff(kickoffAt: string | null, locale: string): string {
  if (!kickoffAt) return "";
  try {
    return new Date(kickoffAt).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function TeamFlag({ src }: { src: string | null }) {
  if (!src) return null;
  // biome-ignore lint/performance/noImgElement: flag icons are small static SVGs
  return <img src={src} alt="" className="size-4 shrink-0 object-contain" />;
}

function MatchCard({
  col,
  members,
  viewerId,
  t,
  onStartEdit,
  onStartDualSave,
  onReset,
}: {
  col: MatchColumn;
  members: MemberPredictionRow[];
  viewerId: string;
  t: ReturnType<typeof useDictionary>["pools"]["predictions"];
  onStartEdit: (col: MatchColumn, h: number | null, a: number | null) => void;
  onStartDualSave: (col: MatchColumn) => void;
  onReset: (matchId: string) => void;
}) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-1.5 min-w-0">
          <TeamFlag src={col.homeFlag} />
          <span className="text-sm font-semibold truncate">{col.homeLabel}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {col.sublabel ? `${col.sublabel}` : "vs"}
          </span>
          <span className="text-sm font-semibold truncate">{col.awayLabel}</span>
          <TeamFlag src={col.awayFlag} />
        </div>
        {col.kickoffAt && (
          <span className="text-xs text-muted-foreground shrink-0 ml-auto">
            {formatKickoff(col.kickoffAt, "es")}
          </span>
        )}
      </div>
      <div className="divide-y">
        {members.map((member) => {
          const cell = member.cells[col.matchId];
          const isViewer = member.userId === viewerId;
          const hasPrediction = cell?.predictedHome != null && cell?.predictedAway != null;
          const hasPoints = cell?.totalPoints != null;
          const canEdit =
            isViewer &&
            col.matchStatus === "SCHEDULED" &&
            col.kickoffAt &&
            new Date(col.kickoffAt) > new Date();

          return (
            <div
              key={member.userId}
              className="flex items-center gap-2 px-3 py-1.5"
              data-testid={`prediction-cell-${member.userId}-${col.matchId}`}
            >
              <Avatar className="size-5 shrink-0">
                <AvatarImage src={member.avatarUrl ?? undefined} alt="" />
                <AvatarFallback className="text-[10px]">
                  {member.nickname.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate min-w-0 flex-1">{member.nickname}</span>
              <span className="text-sm tabular-nums shrink-0">
                {hasPrediction ? `${cell.predictedHome} - ${cell.predictedAway}` : t.noPrediction}
              </span>
              {cell?.isOverride && (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {t.overrideBadge}
                </Badge>
              )}
              {hasPoints ? (
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {cell.totalPoints} pts
                </Badge>
              ) : (
                <span className="text-[10px] text-muted-foreground shrink-0">{t.pendingScore}</span>
              )}
              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  <Badge
                    variant="outline"
                    className="text-[10px] cursor-pointer hover:bg-muted transition-colors"
                    onClick={() =>
                      hasPrediction
                        ? onStartEdit(col, cell?.predictedHome ?? null, cell?.predictedAway ?? null)
                        : onStartDualSave(col)
                    }
                  >
                    {t.saveForThisPool}
                  </Badge>
                  {cell?.isOverride && cell?.hasGlobal && (
                    <button
                      type="button"
                      onClick={() => onReset(col.matchId)}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                      data-testid={`reset-override-${col.matchId}`}
                      title={t.useGlobalPrediction}
                    >
                      <Undo2 className="size-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PoolPredictionsView({
  predictions,
  matches,
  members,
  poolId,
  viewerId,
  initialPage,
}: PoolPredictionsViewProps) {
  const dictionary = useDictionary();
  const t = dictionary.pools.predictions;
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timeZone = useSyncExternalStore(subscribeToTimeZone, getBrowserTimeZone, () => "UTC");
  const [editingMatch, setEditingMatch] = useState<MatchColumn | null>(null);
  const [isDualSave, setIsDualSave] = useState(false);
  const [editHome, setEditHome] = useState(0);
  const [editAway, setEditAway] = useState(0);
  const [saving, setSaving] = useState(false);

  const currentPage = useMemo(() => {
    const raw = searchParams.get("page");
    if (raw !== null) {
      const parsed = parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    }
    return initialPage ?? Number.NaN;
  }, [searchParams, initialPage]);

  const handleStartEdit = useCallback(
    (col: MatchColumn, currentHome: number | null, currentAway: number | null) => {
      setEditHome(currentHome ?? 0);
      setEditAway(currentAway ?? 0);
      setIsDualSave(false);
      setEditingMatch(col);
    },
    [],
  );

  const handleStartDualSave = useCallback((col: MatchColumn) => {
    setEditHome(0);
    setEditAway(0);
    setIsDualSave(true);
    setEditingMatch(col);
  }, []);

  const handleCloseModal = useCallback(() => {
    setEditingMatch(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingMatch) return;
    setSaving(true);
    const result = await savePrediction({
      matchId: editingMatch.matchId,
      homeScore: editHome,
      awayScore: editAway,
      penaltyWinnerTeamId: null,
      poolId,
    });
    setSaving(false);
    if ("success" in result && result.success) {
      toast.success(t.overrideSaved);
      setEditingMatch(null);
      startTransition(() => router.refresh());
    } else if ("error" in result) {
      toast.error(result.error);
    }
  }, [editingMatch, editHome, editAway, poolId, t.overrideSaved, router]);

  const handleDualSave = useCallback(async () => {
    if (!editingMatch) return;
    setSaving(true);
    const result = await savePrediction({
      matchId: editingMatch.matchId,
      homeScore: editHome,
      awayScore: editAway,
      penaltyWinnerTeamId: null,
      poolId,
      alsoSaveAsGlobal: true,
    });
    setSaving(false);
    if ("success" in result && result.success) {
      toast.success(t.overrideSaved);
      setEditingMatch(null);
      startTransition(() => router.refresh());
    } else if ("error" in result) {
      toast.error(result.error);
    }
  }, [editingMatch, editHome, editAway, poolId, t.overrideSaved, router]);

  const handlePoolOnly = useCallback(() => {
    setEditingMatch(null);
    toast.error("Primero guarda tu predicción global en /partidos");
  }, []);

  const handleReset = useCallback(
    async (matchId: string) => {
      const result = await resetPredictionOverride({ matchId, poolId });
      if ("success" in result && result.success) {
        toast.success(t.usingGlobalToast);
        startTransition(() => router.refresh());
      } else if ("error" in result) {
        toast.error(result.error);
      }
    },
    [poolId, t.usingGlobalToast, router],
  );

  const navigateToPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams);
      params.set("page", String(page));
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router],
  );

  const allDays = buildDayGroups(predictions, members, locale, timeZone, matches);
  const { visibleDays: paginatedDays, ...pageInfo } = paginateDays(allDays, timeZone, currentPage);
  const { currentPage: resolvedPage, totalPages, hasPrev, hasNext } = pageInfo;
  const visibleDays = paginatedDays;

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-lg font-semibold text-muted-foreground">{t.emptyTitle}</p>
        <p className="text-sm text-muted-foreground">{t.emptyDescription}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigateToPage(resolvedPage - 1)}
              disabled={!hasPrev}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              {t.pageIndicator
                .replace("{current}", String(resolvedPage + 1))
                .replace("{total}", String(totalPages))}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigateToPage(resolvedPage + 1)}
              disabled={!hasNext}
            >
              Siguiente
            </Button>
          </div>
        )}
        <div className="space-y-8">
          {visibleDays.map((day) => (
            <section key={day.dayKey} className="space-y-3">
              <h3 className="text-lg font-semibold">{day.label}</h3>
              <div className="flex flex-col gap-3">
                {day.matches.map((col) => (
                  <MatchCard
                    key={col.matchId}
                    col={col}
                    members={day.memberRows}
                    viewerId={viewerId}
                    t={t}
                    onStartEdit={handleStartEdit}
                    onStartDualSave={handleStartDualSave}
                    onReset={handleReset}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {editingMatch && (
        <Dialog open onOpenChange={handleCloseModal}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">
                <span className="flex items-center justify-center gap-1.5">
                  <TeamFlag src={editingMatch.homeFlag} />
                  <span>{editingMatch.homeLabel}</span>
                  <span className="text-xs text-muted-foreground">
                    {editingMatch.sublabel ? editingMatch.sublabel : "vs"}
                  </span>
                  <span>{editingMatch.awayLabel}</span>
                  <TeamFlag src={editingMatch.awayFlag} />
                </span>
              </DialogTitle>
              {editingMatch.sublabel && (
                <p className="text-sm text-muted-foreground">{editingMatch.sublabel}</p>
              )}
              {editingMatch.kickoffAt && (
                <p className="text-xs text-muted-foreground">
                  {formatKickoff(editingMatch.kickoffAt, locale)}
                </p>
              )}
            </DialogHeader>
            {isDualSave && (
              <p className="text-sm text-muted-foreground text-center">
                No tienes predicción global para este partido.
              </p>
            )}
            <div className="flex flex-col items-center gap-3 py-2">
              <PredictionScoreControls
                homeScore={editHome}
                awayScore={editAway}
                homeLabel="Casa"
                awayLabel="Fuera"
                onChange={(h, a) => {
                  setEditHome(h);
                  setEditAway(a);
                }}
                disabled={saving}
              />
            </div>
            <div className="flex justify-center gap-2">
              {isDualSave ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePoolOnly}
                    disabled={saving}
                  >
                    Solo para esta liga
                  </Button>
                  <Button type="button" size="sm" onClick={handleDualSave} disabled={saving}>
                    {saving ? "..." : "Guardar como global también"}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCloseModal}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? "..." : t.saveForThisPool}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
