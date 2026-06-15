# Unit 24 — Code Generation Plan: Internacionalización y Selector de Idioma

> Single source of truth for Unit 24 Code Generation. Application code changes must be made in the workspace root, never in `aidlc-docs/`. Documentation summaries only may be written under `aidlc-docs/construction/unit-24-i18n-language-selection/code/`.

## Planning Checklist

- [x] Read Unit 24 functional design.
- [x] Read `aidlc-state.md` for workspace root and code location rules.
- [x] Read Unit 24 definition from `unit-of-work.md`.
- [x] Inspect existing i18n, profile, layout, rules content and Prisma schema entry points.
- [x] Identify dependencies on Units 2, 11, 12/15 and Content Collections.
- [x] Define executable generation sequence with checkboxes.
- [x] Log approval prompt in `audit.md`.

## Unit Context

Unit 24 adds bilingual Spanish/English UI support without URL locale prefixes. The approved behavior is:

- Spanish (`es`) remains the default locale.
- English (`en`) is optional and user-selectable.
- Locale resolution uses cookie `locale`, `profiles.locale`, `Accept-Language` and default `es` in that order.
- Locale changes persist to the cookie and, for authenticated users, `profiles.locale`.
- The selector appears in `UserMenu` and Settings/Profile.
- The Rules Center MDX exists in `content/rules/es` and `content/rules/en`, with stable `/rules` URLs.
- Visible Spanish copy keeps accepted English loans: `email`, `passkey`, `nickname`, `Google`, `WebAuthn`, `TOTP`, `push` / `web push`.

## Story Traceability

- `US-23.1`: choose language from the app.
- `US-23.2`: see a homogeneous experience without mixed copy.
- `US-23.3`: read Rules Center content in the active language.
- `US-23.4`: keep existing URLs while changing language.

## Dependencies and Interfaces

- Unit 2: existing i18n structure in `src/i18n` and MDX rules content.
- Unit 11: `UserMenu` / app shell placement for the quick selector.
- Unit 12/15: Settings/Profile page and profile persistence.
- Prisma: `Profile` receives `locale` with default `es` and DB mapping `locale`.
- Content Collections: rule loaders must filter by active locale through a whitelisted locale value.

## Code Generation Steps

### Step 1: Locale Config and Resolution

- [ ] Update `src/i18n/config.ts` to support `es` and `en`, keep `DEFAULT_LOCALE = "es"`, and expose safe parsing helpers.
- [ ] Update `src/i18n/get-dictionary.ts` to load both dictionaries and return `es` as fallback.
- [ ] Add a locale helper module for cookie/header/profile resolution with whitelisted values only.
- [ ] Add unit tests for supported locale parsing and resolution precedence.

### Step 2: Profile Locale Persistence

- [ ] Add `Profile.locale` to `prisma/schema.prisma` with default `es`.
- [ ] Add a Prisma migration that backfills existing profiles and constrains values to `es` or `en`.
- [ ] Regenerate Prisma client.
- [ ] Ensure profile query types include locale where needed.

### Step 3: Locale Server Action

- [ ] Create `src/features/profile/actions/set-locale.ts`.
- [ ] Validate input against supported locales.
- [ ] Write the `locale` cookie for SSR without flash.
- [ ] Persist `profiles.locale` when a session exists.
- [ ] Revalidate/refresh the current route without changing URL.
- [ ] Add action tests for valid locale, invalid locale and unauthenticated cookie-only behavior.

### Step 4: English Dictionary and Spanish Copy Completion

- [ ] Add `src/i18n/dictionaries/en.ts` satisfying the Spanish dictionary shape.
- [ ] Expand `src/i18n/dictionaries/es.ts` with missing sections needed by current screens.
- [ ] Keep Spanish product terminology aligned with CF-5 and Unit 24 loanword decisions.
- [ ] Update `src/i18n/types.ts` if needed while preserving `es` as the reference shape.

### Step 5: Language Toggle UI

- [ ] Add a shared `LanguageToggle` component with accessible label, selected state and stable `data-testid` values.
- [ ] Integrate the toggle in `src/components/layout/user-menu.tsx`.
- [ ] Integrate the toggle or equivalent language section in `src/features/profile/components/account-settings.tsx`.
- [ ] Add component tests for active locale display and action submission.

### Step 6: Server Dictionary Plumbing

- [ ] Replace direct imports of `es` in server components with active locale + dictionary resolution.
- [ ] Pass only needed dictionary branches into client components where practical.
- [ ] Avoid adding a URL `[locale]` segment or redirecting on locale changes.
- [ ] Preserve existing authenticated route group behavior and middleware gates.

### Step 7: Visible Copy Externalization

- [ ] Externalize hardcoded visible copy in auth, onboarding and settings screens.
- [ ] Externalize hardcoded visible copy in pools, predictions, rankings and competition screens.
- [ ] Externalize hardcoded visible copy in notifications and admin screens.
- [ ] Localize visible `aria-label`, empty-state, validation and toast text where user-facing.
- [ ] Leave dynamic domain data untranslated unless it is product copy.

### Step 8: Rules Center MDX Localization

- [ ] Create `content/rules/en/*.mdx` matching the Spanish rule files and compatible frontmatter.
- [ ] Update the rules content loader to filter by active locale safely.
- [ ] Ensure `/rules` renders the active locale without changing its path.
- [ ] Add or update tests for locale-filtered rules content if an existing seam exists.

### Step 9: Verification and Cleanup

- [ ] Run `pnpm prisma:generate` if not already completed in Step 2.
- [ ] Run TypeScript verification.
- [ ] Run Biome/ESLint checks on touched files or the project command if feasible.
- [ ] Run relevant unit tests and then full test suite if feasible.
- [ ] Run build/content verification if feasible.
- [ ] Create `aidlc-docs/construction/unit-24-i18n-language-selection/code/generation-summary.md` with modified/created files, tests and deferred items.
- [ ] Update this plan checkboxes immediately after each completed step.
- [ ] Update `aidlc-state.md` and `audit.md` in the same interaction as implementation progress.

## Expected Application Code Locations

- `prisma/schema.prisma`
- `prisma/migrations/<timestamp>_unit24_profile_locale/`
- `src/i18n/**`
- `src/lib/locale.ts` or equivalent shared helper
- `src/features/profile/actions/set-locale.ts`
- `src/components/language/language-toggle.tsx`
- `src/components/layout/user-menu.tsx`
- `src/features/profile/components/account-settings.tsx`
- `src/app/**`, `src/features/**`, `src/components/**` as needed for copy externalization
- `content/rules/en/*.mdx`

## Expected Documentation Locations

- `aidlc-docs/construction/unit-24-i18n-language-selection/code/generation-summary.md`
- `aidlc-docs/aidlc-state.md`
- `aidlc-docs/audit.md`
