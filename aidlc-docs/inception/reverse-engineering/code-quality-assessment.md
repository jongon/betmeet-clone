# Code Quality Assessment

## Test Coverage

- **Overall**: Good indicators. The repository contains extensive Vitest coverage across feature services, actions, and UI components. The state file records 265 passing tests after Unit 38.
- **Unit Tests**: Present for auth, profile, pools, competition, predictions, scoring, rankings, notifications, admin, layout, and shared utilities.
- **Integration Tests**: Partial. Server actions and services are tested with mocks/stubs; full browser/e2e coverage is available through Playwright dependency but no complete e2e suite was identified in this reverse engineering pass.
- **Web Push Tests**: Present for dispatcher and match event services under `src/features/notifications/services/__tests__/`.

## Code Quality Indicators

- **Linting**: Configured with ESLint 9 and Next config.
- **Formatting/Style**: Configured with Biome 2.
- **Type Safety**: TypeScript 6 and generated Prisma client are used throughout.
- **Validation**: zod schemas are used for user inputs and provider payload normalization.
- **Documentation**: Strong AI-DLC documentation history exists. Human docs cover stack, architecture, workflows, and project overview.
- **Migration Hygiene**: Prisma migrations are versioned and include RLS/triggers/storage-related baseline plus later feature deltas.

## Technical Debt And Risks

- **Existing AI-DLC reverse engineering gap**: The folder had only `predictions-vs-pools-analysis.md`; the full required artifact set was missing before this rerun.
- **Web Push dispatch trigger**: `/api/notifications/dispatch` relies on external invocation and optional shared secret. Production scheduling/trigger hardening should be verified operationally.
- **Web Push recipient selection**: `getMatchNotificationRecipients` combines users with predictions for the match and all pool members. This may be intentionally broad, but it can notify pool members who have no relationship to the specific match beyond participating in the product.
- **Web Push payload localization**: Event payload text is Spanish string literals in services, not dictionary-driven.
- **Web Push service worker asset**: `public/sw.js` is plain JS and outside TypeScript lint/type checking.
- **Push subscription cleanup**: Dispatcher deactivates 404/410 endpoints. Other repeated failures remain active with failure metadata; retry/backoff policy is minimal.
- **Provider sync resilience**: Notification emission is best-effort and swallowed on failure during match sync, which is good for sync availability but can hide notification production defects without separate monitoring.
- **License compliance**: Package licenses are common permissive licenses for major dependencies, but a formal license scan was not executed.

## Patterns And Anti-Patterns

### Good Patterns

- Feature-based organization with colocated tests.
- Server Actions for mutation boundaries.
- Prisma schema as source of truth for product data.
- Durable outbox pattern for notifications.
- Provider adapter and normalized schemas for football-data.org integration.
- Cache tags and explicit revalidation after result-changing mutations.
- Defense-in-depth onboarding gates: proxy claim checks plus Prisma-backed mutation guards.
- Pure scoring function shared by education and authoritative scoring.

### Anti-Patterns Or Watch Areas

- Some business notification payload copy is embedded in service code rather than i18n dictionaries.
- Service worker code is untyped and minimal, making regressions easier to miss.
- Extensive AI-DLC state history in one file can become difficult to maintain and review.
- Existing production operations depend on dashboard toggles and external env setup; drift is possible without automated checks.
