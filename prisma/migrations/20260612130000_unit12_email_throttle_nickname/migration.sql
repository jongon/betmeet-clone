-- Unit 12 (Refine de Auth/Perfil/Onboarding/Landing)
-- FR-REFINE-12.2: cooldown server-side para acciones por email.
-- FR-REFINE-12.5: rate-limit de cambio de nickname.
-- Idempotente: IF NOT EXISTS / IF EXISTS en cada sentencia.

-- 1. Rate-limit de nickname: marca temporal del último cambio.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname_updated_at timestamptz;

-- 2. Cooldown por email para reenvío de confirmación / cambio de email no confirmado.
CREATE TABLE IF NOT EXISTS public.email_action_throttle (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        varchar(255) NOT NULL,
  action       varchar(40)  NOT NULL,
  last_sent_at timestamptz  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_action_throttle_email_action_key
  ON public.email_action_throttle (email, action);

-- RLS: la tabla solo la tocan server actions vía Prisma (rol owner, bypass de RLS
-- al no usar FORCE). Se habilita RLS sin políticas para denegar acceso directo de
-- authenticated/anon vía PostgREST/Supabase client. Mismo patrón que el resto del repo.
ALTER TABLE public.email_action_throttle ENABLE ROW LEVEL SECURITY;
