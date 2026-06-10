import Image from "next/image";
import type { TeamView } from "../types";

export function TeamBadge({
  team,
  placeholder,
}: {
  team: TeamView | null;
  placeholder: string | null;
}) {
  if (!team) {
    return (
      <span className="text-sm text-muted-foreground">{placeholder ?? "Equipo por definir"}</span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <Image
        src={team.flagPath}
        alt=""
        width={24}
        height={18}
        className="rounded-sm border"
        unoptimized
      />
      <span className="font-medium">{team.name}</span>
      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
        {team.fifaCode}
      </span>
    </span>
  );
}
