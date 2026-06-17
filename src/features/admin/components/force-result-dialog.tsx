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
  const [penaltyWinner, setPenaltyWinner] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isKnockout = match.phaseType === "KNOCKOUT";
  const tied = homeScore === awayScore;
  const showPenaltyWinner = isKnockout && tied;

  async function handleSubmit() {
    setPending(true);
    setError(null);
    const result = await forceMatchResult(match.id, {
      homeScore,
      awayScore,
      homePenaltyScore: isKnockout ? homePenalty : null,
      awayPenaltyScore: isKnockout ? awayPenalty : null,
      penaltyWinnerTeamId: showPenaltyWinner ? penaltyWinner : null,
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
              <div className="flex gap-2">
                {[
                  { id: match.homeTeamId, name: match.homeTeamLabel },
                  { id: match.awayTeamId, name: match.awayTeamLabel },
                ].map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setPenaltyWinner(team.id)}
                    data-testid={`force-penalty-winner-${team.id}`}
                    className={`rounded-md border px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      penaltyWinner === team.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {team.name}
                  </button>
                ))}
              </div>
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
            disabled={pending || reason.trim().length === 0}
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
