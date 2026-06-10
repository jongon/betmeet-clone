-- Migration: Create profiles table
-- Note: This table is also managed via prisma/schema.prisma for Prisma ORM access.
-- Apply this migration in Supabase dashboard (SQL Editor) to enable Row Level Security.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Non-deleted profiles are readable by authenticated users (for leaderboards)
CREATE POLICY "profiles_select_others"
  ON public.profiles FOR SELECT
  USING (deleted_at IS NULL AND auth.uid() IS NOT NULL);

-- Users can update their own non-deleted profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = id);

-- Insert is disabled at row level (handled by trigger only)
-- Delete is disabled at row level (soft delete via UPDATE only)
