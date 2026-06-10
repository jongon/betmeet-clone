-- Migration: Profile auto-creation trigger on new Supabase Auth user
-- Apply in Supabase dashboard (SQL Editor).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_avatar_url TEXT;
BEGIN
  SELECT storage_url INTO default_avatar_url
  FROM public.avatar_assets
  ORDER BY RANDOM()
  LIMIT 1;

  INSERT INTO public.profiles (id, avatar_url, avatar_source, verification_status)
  VALUES (
    NEW.id,
    COALESCE(default_avatar_url, ''),
    'DEFAULT_SET',
    'UNVERIFIED'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
