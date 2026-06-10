-- Migration: Pools and Memberships — constraints + RLS (Unit 3)
-- The table schemas (pools, pool_memberships) are managed via prisma/schema.prisma.
-- This migration adds constraints not expressible in Prisma and Row Level Security.
-- Apply in Supabase dashboard (SQL Editor).
--
-- Note: application writes go through Prisma (direct connection, bypasses RLS) with
-- server-side authorization (BR-3.28). RLS below is defense-in-depth for any direct
-- supabase-js access (e.g. gating reads).

-- Capacity bounds (BR-3.1)
ALTER TABLE public.pools
  ADD CONSTRAINT pools_capacity_range CHECK (capacity BETWEEN 2 AND 100);

-- Pool name unique only among PUBLIC pools (BR-3.2)
CREATE UNIQUE INDEX pools_public_name_unique
  ON public.pools (name)
  WHERE type = 'PUBLIC';

-- ---------------------------------------------------------------------------
-- RLS: pools
-- ---------------------------------------------------------------------------
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;

-- Public pools are readable by any authenticated user (directory + landing preview)
CREATE POLICY "pools_select_public"
  ON public.pools FOR SELECT
  USING (type = 'PUBLIC' AND auth.uid() IS NOT NULL);

-- A pool is readable by its members (covers private pools)
CREATE POLICY "pools_select_member"
  ON public.pools FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pool_memberships m
      WHERE m.pool_id = pools.id AND m.user_id = auth.uid()
    )
  );

-- Writes are performed server-side via Prisma; no anon write policies.

-- ---------------------------------------------------------------------------
-- RLS: pool_memberships
-- ---------------------------------------------------------------------------
ALTER TABLE public.pool_memberships ENABLE ROW LEVEL SECURITY;

-- A membership row is readable by members of the same pool
CREATE POLICY "pool_memberships_select_same_pool"
  ON public.pool_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pool_memberships self
      WHERE self.pool_id = pool_memberships.pool_id AND self.user_id = auth.uid()
    )
  );

-- Writes (join/leave/kick/archive) are performed server-side via Prisma with
-- explicit authorization; no anon write policies.
