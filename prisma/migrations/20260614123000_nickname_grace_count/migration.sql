-- Unit 17 (Refine de Nickname Grace Clarification)
-- FR-REFINE-17.3: el usuario tiene una oportunidad de gracia post-onboarding
-- para cambiar su nickname sin esperar 30 dias. `nickname_updated_at` no basta
-- porque tambien se escribe en la asignacion inicial.
-- Idempotente: IF NOT EXISTS + backfill conservador.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname_change_count integer NOT NULL DEFAULT 0;

-- Backfill conservador: cualquier perfil con nickname actual cuenta como nickname
-- #1, preservando una oportunidad de gracia post-onboarding para usuarios
-- existentes. Perfiles sin nickname siguen en 0.
UPDATE public.profiles
  SET nickname_change_count = 1
  WHERE nickname_base IS NOT NULL
    AND nickname_change_count = 0;
