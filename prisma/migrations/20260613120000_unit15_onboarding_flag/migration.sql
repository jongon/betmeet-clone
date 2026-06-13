-- Unit 15 (Refine de Landing/Reglas/Perfil/Auth/Calculadora)
-- FR-REFINE-15.13: gating de onboarding explícito en vez de inferir por
-- `nickname_base` nulo (que hacía fail-open cuando la lectura RLS del proxy
-- fallaba, dejando entrar a usuarios nuevos sin pasar por onboarding).
-- Idempotente: IF NOT EXISTS.

-- 1. Flag explícito de onboarding completado. Nuevas filas (trigger
--    handle_new_user) heredan el DEFAULT false.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- 2. Backfill: los usuarios existentes que ya eligieron nickname han completado
--    el onboarding.
UPDATE public.profiles
  SET onboarding_completed = true
  WHERE nickname_base IS NOT NULL
    AND onboarding_completed = false;
