"use client";

import { useState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { derivePenaltyWinner } from "@/features/scoring/compute-score";
import { useDictionary } from "@/i18n/dictionary-provider";
import { forceMatchResult } from "../actions/force-result";
import type { AdminMatchRow } from "../types";

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <input
        id={id}
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number.parseInt(e.target.value, 10) || 0))}
        data-testid={id}
        className="h-9 w-16 rounded-md border bg-transparent px-2 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

export function ForceResultDialog({ match }: { match: AdminMatchRow }) {
  const t = useDictionary().admin;
  const [open, setOpen] = useState(false);
  const [homeScore, setHomeScore] = useState(match.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(match.awayScore ?? 0);
  const [homePenalty, setHomePenalty] = useState(0);
  const [awayPenalty, setAwayPenalty] = useState(0);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isKnockout = match.phaseType === "KNOCKOUT";
  const tied = homeScore === awayScore;
  const showPenaltyWinner = isKnockout && tied;
  const derivedWinner = showPenaltyWinner ? derivePenaltyWinner(homePenalty, awayPenalty) : null;
  const resolvedTeamId =
    derivedWinner === "home"
      ? match.homeTeamId
      : derivedWinner === "away"
        ? match.awayTeamId
        : null;
  const penaltyShootoutTied = showPenaltyWinner && homePenalty === awayPenalty;

  async function handleSubmit() {
    setPending(true);
    setError(null);
    const result = await forceMatchResult(match.id, {
      homeScore,
      awayScore,
      homePenaltyScore: isKnockout ? homePenalty : null,
      awayPenaltyScore: isKnockout ? awayPenalty : null,
      penaltyWinnerTeamId: resolvedTeamId,
      reason,
    });
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setOpen(false);
    setPending(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        data-testid={`force-result-${match.id}`}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {t.forceResult}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{match.label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FormError messages={error ? [error] : undefined} />

          <div className="flex items-end gap-4">
            <NumberField
              id="force-result-home"
              label={match.homeTeamLabel}
              value={homeScore}
              onChange={setHomeScore}
            />
            <span className="pb-2 text-muted-foreground">-</span>
            <NumberField
              id="force-result-away"
              label={match.awayTeamLabel}
              value={awayScore}
              onChange={setAwayScore}
            />
          </div>

          {isKnockout && (
            <div className="flex items-end gap-4">
              <NumberField
                id="force-penalty-home"
                label={t.homePenalties}
                value={homePenalty}
                onChange={setHomePenalty}
              />
              <span className="pb-2 text-muted-foreground">-</span>
              <NumberField
                id="force-penalty-away"
                label={t.awayPenalties}
                value={awayPenalty}
                onChange={setAwayPenalty}
              />
            </div>
          )}

          {showPenaltyWinner && (
            <div className="space-y-1">
              <span className="text-sm font-medium">{t.penaltyWinner}</span>
              {penaltyShootoutTied ? (
                <p className="text-sm text-destructive">
                  La tanda de penales no puede terminar empatada. Ajusta el marcador.
                </p>
              ) : resolvedTeamId ? (
                <p className="text-sm font-semibold">
                  {resolvedTeamId === match.homeTeamId ? match.homeTeamLabel : match.awayTeamLabel}
                </p>
              ) : null}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="force-result-reason">{t.reason}</Label>
            <textarea
              id="force-result-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              data-testid="force-result-reason"
              className="min-h-20 w-full rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <Button
            className="w-full"
            disabled={pending || reason.trim().length === 0 || penaltyShootoutTied}
            onClick={handleSubmit}
            data-testid="force-result-submit"
          >
            {pending ? t.saving : t.forceAndRecalculate}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
