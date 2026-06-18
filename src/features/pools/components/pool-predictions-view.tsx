"use client";

import { Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useState, useSyncExternalStore } from "react";
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
import { buildDayGroups, type MatchColumn } from "./pool-predictions-view-helpers";

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

export function PoolPredictionsView({
  predictions,
  members,
  poolId,
  viewerId,
}: PoolPredictionsViewProps) {
  const dictionary = useDictionary();
  const t = dictionary.pools.predictions;
  const locale = useLocale();
  const router = useRouter();
  const timeZone = useSyncExternalStore(subscribeToTimeZone, getBrowserTimeZone, () => "UTC");
  const [editingMatch, setEditingMatch] = useState<MatchColumn | null>(null);
  const [isDualSave, setIsDualSave] = useState(false);
  const [editHome, setEditHome] = useState(0);
  const [editAway, setEditAway] = useState(0);
  const [saving, setSaving] = useState(false);

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

  if (predictions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-lg font-semibold text-muted-foreground">{t.emptyTitle}</p>
        <p className="text-sm text-muted-foreground">{t.emptyDescription}</p>
      </div>
    );
  }

  const days = buildDayGroups(predictions, members, locale, timeZone);

  return (
    <>
      <div className="space-y-8">
        {days.map((day) => (
          <section key={day.dayKey} className="space-y-3">
            <h3 className="text-lg font-semibold">{day.label}</h3>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm" data-testid="pool-predictions-table">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th
                      className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-medium whitespace-nowrap"
                      data-testid="pool-predictions-member-header"
                    >
                      {t.memberHeader}
                    </th>
                    {day.matches.map((col) => (
                      <th
                        key={col.matchId}
                        className="px-3 py-2 text-center font-medium whitespace-nowrap"
                      >
                        <div>{col.label}</div>
                        {col.sublabel && (
                          <div className="text-xs font-normal text-muted-foreground">
                            {col.sublabel}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {day.memberRows.map((member) => {
                    const isViewer = member.userId === viewerId;
                    return (
                      <tr key={member.userId} className="border-b last:border-b-0">
                        <td className="sticky left-0 z-10 bg-background px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-6">
                              <AvatarImage src={member.avatarUrl ?? undefined} alt="" />
                              <AvatarFallback>
                                {member.nickname.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate font-medium">{member.nickname}</span>
                          </div>
                        </td>
                        {day.matches.map((col) => {
                          const cell = member.cells[col.matchId];
                          const hasPrediction =
                            cell?.predictedHome != null && cell?.predictedAway != null;
                          const hasPoints = cell?.totalPoints != null;
                          const canEdit =
                            isViewer &&
                            col.matchStatus === "SCHEDULED" &&
                            col.kickoffAt &&
                            new Date(col.kickoffAt) > new Date();

                          return (
                            <td
                              key={col.matchId}
                              className="px-3 py-2 text-center whitespace-nowrap"
                              data-testid={`prediction-cell-${member.userId}-${col.matchId}`}
                            >
                              <div className="flex flex-col items-center gap-1">
                                <span className="tabular-nums-display">
                                  {hasPrediction
                                    ? `${cell.predictedHome} - ${cell.predictedAway}`
                                    : t.noPrediction}
                                </span>
                                {cell?.isOverride && (
                                  <Badge variant="outline" className="text-xs">
                                    {t.overrideBadge}
                                  </Badge>
                                )}
                                {hasPoints ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {cell.totalPoints} pts
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    {t.pendingScore}
                                  </span>
                                )}
                                {canEdit && (
                                  <div className="flex gap-1 mt-0.5">
                                    <Badge
                                      variant="outline"
                                      className="text-xs cursor-pointer hover:bg-muted transition-colors"
                                      onClick={() =>
                                        hasPrediction
                                          ? handleStartEdit(
                                              col,
                                              cell?.predictedHome ?? null,
                                              cell?.predictedAway ?? null,
                                            )
                                          : handleStartDualSave(col)
                                      }
                                    >
                                      {hasPrediction ? t.saveForThisPool : t.saveForThisPool}
                                    </Badge>
                                    {cell?.isOverride && cell?.hasGlobal && (
                                      <button
                                        type="button"
                                        onClick={() => handleReset(col.matchId)}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                        data-testid={`reset-override-${col.matchId}`}
                                        title={t.useGlobalPrediction}
                                      >
                                        <Undo2 className="inline size-3" />
                                        <span className="sr-only">{t.useGlobalPrediction}</span>
                                      </button>
                                    )}
                                    {!hasPrediction && (
                                      <Link
                                        href="/matches"
                                        className="text-xs text-muted-foreground underline hover:text-foreground"
                                        title="Ir a /partidos"
                                      >
                                        Ir a /partidos
                                      </Link>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      {editingMatch && (
        <Dialog open onOpenChange={handleCloseModal}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">{editingMatch.label}</DialogTitle>
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
