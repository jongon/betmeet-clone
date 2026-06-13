# Unit 8 — Design System and UI Polish

Added post-construction via `/aidlc-refine` (2026-06-10). Cross-cutting; does not
change Units 1–7 behavior, only presentation.

## Goal

A distinctive, modern, accessible, **themeable** UI for "Liga Mundial 2026",
replacing the default neutral shadcn palette, without rewriting feature
components.

## Architecture — token layers + two orthogonal axes

Single source of truth: `src/app/globals.css`.

- **Layer 1 — `@theme inline`**: maps semantic tokens to Tailwind color utilities
  (`--color-primary → var(--primary)`, etc.). Components keep using
  `bg-primary`, `text-foreground`, and the new `bg-brand` / `text-live` /
  `text-success` / `text-warning`.
- **Layer 2 — semantic tokens** (`--primary`, `--background`, `--brand`, …):
  defined per theme block. This is the only layer that changes between themes,
  so components never need editing.
- **Axis A — Brand/personality** via `data-theme` on `<html>`:
  `deportivo` (default) · `moderno` · `premium`.
- **Axis B — Color scheme** via `.dark` (next-themes): light · dark.
- Blocks: `:root` (deportivo light), `.dark` (deportivo dark),
  `[data-theme="moderno"]`, `[data-theme="moderno"].dark`,
  `[data-theme="premium"]`, `[data-theme="premium"].dark` → 6 valid combinations.

## Default identity — "deportivo / enérgico"

- **Primary** Pitch Green `#0f9e58` (dark `#1dbe74`)
- **Brand accent** Trophy Gold `#f5a524` (dark `#fbbf24`)
- **Live** Goal Red `#ef4444` (dark `#fb5252`)
- **Backgrounds** Chalk `#fafaf7` (light) / Stadium Navy `#0a0f1a` (dark)
- **Display type** Barlow Semi Condensed (headings + score/point numerals),
  body remains Geist. Exposed as `--font-display`; helpers `.font-display` and
  `.tabular-nums-display`.
- **Signature**: athletic tabular numerals for scores/points; gold accents for
  leader (rank #1) and brand emphasis; pulsing live badge.

## Brand selection (runtime, anti-FOUC)

- `src/components/providers/brand-theme-provider.tsx`: `useBrandTheme()` via
  `useSyncExternalStore` (no setState-in-effect, no hydration mismatch), plus
  `setBrand()` that updates `<html data-theme>` and persists to localStorage.
- Pre-paint bootstrap script in `src/app/layout.tsx` (`BRAND_BOOTSTRAP`) sets the
  attribute before first paint; `<html data-theme="deportivo">` default + 
  `suppressHydrationWarning`.
  - **Security note (Security Baseline)**: the bootstrap is injected via
    `<script dangerouslySetInnerHTML>` with a local
    `biome-ignore lint/security/noDangerouslySetInnerHtml`. Accepted exception —
    `BRAND_BOOTSTRAP` is a **static compile-time literal with no user/request
    input**; the persisted brand is only matched against a whitelist and written
    with `setAttribute`, never concatenated into HTML → not an XSS sink. Standing
    constraint: keep it a static literal, and add a sha256 hash/nonce to
    `script-src` when CSP moves from Report-Only to enforce. See
    [`CF-8`](../../inception/carry-forward-decisions.md) (SECURITY-04 / SECURITY-05).
- `src/components/theme/brand-toggle.tsx`: popover selector (swatch + label +
  description) placed next to the existing light/dark `ThemeToggle` on `/` and
  `/rules`.

## Files changed

- `src/app/globals.css` — token system (6 theme blocks, new semantic tokens, display type).
- `src/app/layout.tsx` — Barlow font, anti-FOUC script, BrandThemeProvider.
- `src/components/providers/brand-theme-provider.tsx` — new (brand axis store).
- `src/components/theme/brand-toggle.tsx` — new (brand selector).
- `src/components/ui/badge.tsx` — `brand` + `live` variants.
- `src/app/page.tsx`, `src/app/rules/page.tsx` — mount BrandToggle.
- `src/i18n/dictionaries/es.ts` — `brand.*` keys, `landing.heroEyebrow`.
- Anchor screens polished: `landing-hero.tsx`, `pool-card.tsx`, `match-card.tsx`,
  `match-status-badge.tsx`, `pool-leaderboard.tsx`.
- `eslint.config.mjs` — ignore vendored tooling dirs (`.opencode`, `.claude`, `.aidlc`).

## Accessibility & verification

- Tokens chosen for AA contrast across all 6 combinations; visible focus rings
  (`--ring`), keyboard-navigable theme/brand controls (`aria-label`,
  `aria-pressed`).
- Verified: `tsc --noEmit` 0 errors · Biome clean · ESLint 0 · vitest 111/111 ·
  `next build` passing. No regression to Units 1–7.

## Live UX audit (2026-06-10, Playwright/Chromium against http://app:3000)

Captured /, /rules, /sign-in and /pools across deportivo·light, deportivo·dark,
moderno·light, premium·dark, plus a 390px mobile landing.

Results:
- Brand switching verified: all 3 personalities render correctly via tokens
  (deportivo green+gold, moderno indigo, premium violet+gold) with no component
  changes; light/dark both clean.
- Landing, rules (accordion + calculator), and pools empty state read well;
  mobile landing is responsive and legible; primary CTAs are brand-green and
  prominent; contrast looks AA across combinations.

Findings:
1. [Medium] `/sign-in` copy is in English ("Continue with Google", "Email",
   "Sign in", "Don't have an account?") while the rest of the app is Spanish —
   pre-existing inconsistency from Unit 1 (auth), not introduced by Unit 8.
   Suggested fix: route auth strings through `es` dictionary.
2. [Low] Desktop landing has a large empty band above the hero — optional:
   tighten top spacing.
3. [Low] Top-right theme/brand controls are icon-only (have aria-label + title);
   acceptable, but a one-time hint could improve discoverability.

## Remaining (optional)

- Address finding #1 (auth i18n) if desired — small, outside Unit 8 scope.
- Extend polish to admin tables and settings screens.
