# Unit 24 Code Generation Summary

## Scope
- Added Spanish default + English option without locale URL prefixes.
- Persisted language in cookie `locale` and `profiles.locale`.
- Added language selector in `UserMenu` and Settings/Profile.
- Externalized visible UI copy through typed dictionaries.
- Added English MDX rules content.

## Key Code Changes
- `src/i18n/*`: locale config, dictionary loading, provider/hooks, `es` and `en` dictionaries.
- `src/lib/locale.ts`: request locale resolution by cookie, profile, `Accept-Language`, fallback.
- `src/features/profile/actions/set-locale.ts`: Server Action to persist locale and revalidate current path.
- `prisma/schema.prisma` + `prisma/migrations/20260615100000_unit24_profile_locale/`: profile locale column.
- `src/components/language/language-toggle.tsx`: accessible language selector.
- `content/rules/en/*.mdx`: English rules mirror.

## Verification
- `pnpm exec eslint src`: passed.
- `pnpm exec biome check src content prisma`: passed with one warning for the existing TOTP QR data-URI `<img>` exception.
- `pnpm exec vitest run --dir src`: passed, 47 files / 187 tests.
- `pnpm build`: passed for the app when `api-football/` was temporarily excluded from TypeScript scope for verification; `tsconfig.json` was restored afterward.
- Full-repo commands remain blocked by the nested `api-football/` tree being included by root globs/config; app-scoped verification passed.
