ALTER TABLE "profiles"
  ADD COLUMN "locale" VARCHAR(2) NOT NULL DEFAULT 'es';

ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_locale_check" CHECK ("locale" IN ('es', 'en'));
