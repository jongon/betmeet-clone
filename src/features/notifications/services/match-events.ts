import type { MatchStatus } from "@/generated/prisma/enums";
import { getMatchNotificationRecipients, queueNotificationEvents } from "./events";

interface MatchEventSnapshot {
  id: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam?: { name: string } | null;
  awayTeam?: { name: string } | null;
}

function matchLabel(match: MatchEventSnapshot) {
  const home = match.homeTeam?.name ?? "Equipo local";
  const away = match.awayTeam?.name ?? "Equipo visitante";
  return `${home} vs ${away}`;
}

export async function emitMatchNotificationEvents(
  previous: MatchEventSnapshot | null,
  current: MatchEventSnapshot,
) {
  const recipients = await getMatchNotificationRecipients(current.id);
  if (recipients.length === 0) return;

  const events = [];
  const label = matchLabel(current);
  const url = `/matches#match-${current.id}`;

  if (previous?.status !== "LIVE" && current.status === "LIVE") {
    events.push(
      ...recipients.map((recipientUserId) => ({
        type: "MATCH_STARTED" as const,
        dedupeKey: `match:${current.id}:started:${recipientUserId}`,
        recipientUserId,
        payload: { title: "Empezó el partido", body: label, url },
      })),
    );
  }

  if (previous?.status !== "FINISHED" && current.status === "FINISHED") {
    events.push(
      ...recipients.map((recipientUserId) => ({
        type: "MATCH_FINISHED" as const,
        dedupeKey: `match:${current.id}:finished:${recipientUserId}`,
        recipientUserId,
        payload: { title: "Terminó el partido", body: label, url },
      })),
    );
  }

  const previousTotal = (previous?.homeScore ?? 0) + (previous?.awayScore ?? 0);
  const currentTotal = (current.homeScore ?? 0) + (current.awayScore ?? 0);
  if (current.status === "LIVE" && currentTotal > previousTotal) {
    const score = `${current.homeScore ?? 0}-${current.awayScore ?? 0}`;
    events.push(
      ...recipients.map((recipientUserId) => ({
        type: "GOAL_SCORED" as const,
        dedupeKey: `match:${current.id}:goal:${score}:${recipientUserId}`,
        recipientUserId,
        payload: { title: "Gol anotado", body: `${label} va ${score}`, url },
      })),
    );
  }

  await queueNotificationEvents(events);
}
