import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PoolDetail } from "../types";
import { KickButton } from "./kick-button";

export function MemberList({ pool }: { pool: PoolDetail }) {
  return (
    <ul className="divide-y rounded-xl border" data-testid="pool-member-list">
      {pool.members.map((member) => (
        <li key={member.userId} className="flex items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={member.avatarUrl} alt="" />
              <AvatarFallback>{member.nickname.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{member.nickname}</p>
              <p className="text-xs text-muted-foreground">
                {member.isOwner
                  ? "Administrador"
                  : `Desde ${new Date(member.joinedAt).toLocaleDateString("es")}`}
              </p>
            </div>
          </div>
          {pool.isOwner && !member.isOwner && !pool.isFrozen && (
            <KickButton poolId={pool.id} userId={member.userId} />
          )}
        </li>
      ))}
    </ul>
  );
}
