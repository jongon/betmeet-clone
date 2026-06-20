import type { PoolType } from "../types";
import { PoolSettingsCardClient } from "./pool-settings-card-client";

interface PoolSettingsCardProps {
  poolId: string;
  poolType: PoolType;
  initialName: string;
  initialMembersCanInvite: boolean;
}

/**
 * Server component wrapper for the pool settings card. Renders the client
 * component with the current pool name (Unit 54) and `membersCanInvite` value
 * (BR-45.8, US-45.2) as initial state. The card is shown for any owner; the
 * invite toggle inside is gated to PRIVATE pools (BR-54.3, BR-47.5).
 */
export function PoolSettingsCard({
  poolId,
  poolType,
  initialName,
  initialMembersCanInvite,
}: PoolSettingsCardProps) {
  return (
    <PoolSettingsCardClient
      poolId={poolId}
      poolType={poolType}
      initialName={initialName}
      initialMembersCanInvite={initialMembersCanInvite}
    />
  );
}
