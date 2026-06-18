-- Unit 45: Configurable invite permission for non-owner members in PRIVATE pools.
-- Adds a column `members_can_invite` to `pools`, defaulting to TRUE so existing
-- pools (and the Unit 44 "any member can invite" behavior) keep working without
-- a data backfill. The column is consulted by `createDirectedInvite` only when
-- `type = 'PRIVATE'`; PUBLIC pools ignore it (no directed invites go through
-- the gated path for those).
ALTER TABLE "pools" ADD COLUMN "members_can_invite" BOOLEAN NOT NULL DEFAULT TRUE;
