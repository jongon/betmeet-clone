-- Migration: Supabase Storage RLS policies for the avatars bucket
-- Apply in Supabase dashboard (SQL Editor) after creating the 'avatars' bucket.

-- Public read for default avatars
CREATE POLICY "avatars_defaults_public_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'defaults'
  );

-- Owner read for custom avatars
CREATE POLICY "avatars_custom_owner_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'custom'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- Owner insert for custom avatars
CREATE POLICY "avatars_custom_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'custom'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- Owner delete for custom avatars (for replace strategy)
CREATE POLICY "avatars_custom_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'custom'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );
