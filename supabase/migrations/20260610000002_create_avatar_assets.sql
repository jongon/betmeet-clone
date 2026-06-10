-- Migration: Create avatar_assets table RLS
-- The table schema is managed via prisma/schema.prisma.
-- Apply in Supabase dashboard (SQL Editor).

ALTER TABLE public.avatar_assets ENABLE ROW LEVEL SECURITY;

-- Public read — anyone can see the default avatar set
CREATE POLICY "avatar_assets_select_public"
  ON public.avatar_assets FOR SELECT
  USING (true);

-- Service role only for writes (seed script)
-- INSERT/UPDATE/DELETE blocked at row level; only service_role bypasses RLS
