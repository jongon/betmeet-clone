"use client";

import { Badge } from "@/components/ui/badge";
import type { MatchStatus } from "@/generated/prisma/enums";
import { useDictionary } from "@/i18n/dictionary-provider";

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const { competition } = useDictionary();
  const labels: Record<MatchStatus, string> = {
    SCHEDULED: competition.scheduled,
    LOCKED: competition.locked,
    LIVE: competition.live,
    FINISHED: competition.finished,
    POSTPONED: competition.postponed,
    CANCELLED: competition.cancelled,
  };

  if (status === "LIVE") {
    return (
      <Badge variant="live">
        <span className="size-1.5 animate-pulse rounded-full bg-live" aria-hidden="true" />
        {labels[status]}
      </Badge>
    );
  }
  return <Badge variant="secondary">{labels[status]}</Badge>;
}
