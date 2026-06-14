-- Keep profile verification aligned with confirmed Supabase Auth users.
-- ADMIN is intentionally preserved by only promoting UNVERIFIED rows.
UPDATE public.profiles AS p
SET verification_status = 'VERIFIED'::"VerificationStatus",
    updated_at = now()
FROM auth.users AS u
WHERE p.id = u.id
  AND u.email_confirmed_at IS NOT NULL
  AND p.verification_status = 'UNVERIFIED'::"VerificationStatus";
