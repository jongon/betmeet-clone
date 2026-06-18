import { PoolSettingsCardClient } from "./pool-settings-card-client";

interface PoolSettingsCardProps {
  poolId: string;
  initialMembersCanInvite: boolean;
}

/**
 * Server component wrapper for the pool settings card. Renders the
 * client component with the current `membersCanInvite` value as the initial
 * state of the switch (BR-45.8, US-45.2).
 */
export function PoolSettingsCard({ poolId, initialMembersCanInvite }: PoolSettingsCardProps) {
  return (
    <PoolSettingsCardClient poolId={poolId} initialMembersCanInvite={initialMembersCanInvite} />
  );
}
