# Services

## Supabase Auth Service

Coordinates Supabase SSR auth helpers with Next.js App Router.

- Handles session hydration server-side.
- Provides auth guards for user, verified user, and administrator.
- Delegates provider login, passkeys, MFA, and password reset to Supabase Auth.

## Profile Service

Owns application identity beyond Supabase Auth.

- Creates profile after first authentication.
- Applies verification state: email/password requires email verification; Google OAuth is verified by default.
- Generates `nickname#1234` discriminators.
- Handles avatar source changes and Supabase Storage references.

## Competition Service

Maintains internal representation of competitions, teams, phases, and matches.

- Receives normalized data from Football Sync Service.
- Exposes fixture and match state to UI and prediction services.
- Determines whether a match is open for prediction.

## Football Sync Service

v1: se ejecuta como **server action admin manual** (`trigger-sync.ts` → `runCompetitionSync`). El Edge Function programado queda como scaffold/cron a futuro.

- Uses football-data.org adapter by default (era API-Football; migrado en Unit 25).
- Normalizes provider fixtures/results.
- Writes sync logs and failure states.
- Never directly calculates user scores; it updates match data and then triggers Scoring Service.

## Pool Service

Manages pool lifecycle.

- Creates public/private pools.
- Handles invitation codes and public discovery.
- Enforces capacity limit up to 100.
- Freezes member removal after the first match starts.

## Prediction Service

Manages prediction submission.

- Validates match exists, is decided/unlocked, and is still open.
- Allows edits until server-authoritative kickoff time.
- Supports knockout penalty winner only for tied score predictions.
- Keeps records immutable after lock.

## Scoring Service

Calculates deterministic scores.

- Scores every prediction after match completion or admin override.
- Stores per-match score breakdown for transparency.
- Feeds pool leaderboards.

## Ranking Service

Builds pool-only leaderboards.

- Orders by total points descending.
- Supports shared tied winners with no tiebreakers.
- Displays nickname and avatar only.

## Notification Service

Manages user notification preferences, browser subscriptions, and event delivery.

- Stores per-user opt-in preferences for each notification type.
- Stores Web Push subscriptions per device/browser using endpoint and browser public keys.
- Emits deduplicated notification events from pool invitations, match status/score changes, and ranking recalculation.
- Sends via v1 `standard-web-push` provider using VAPID keys; no paid SaaS required for MVP scale.
- Deactivates invalid subscriptions after push service `404/410` responses and records sanitized send failures.

## Admin Service

Provides global-admin-only operations.

- Sync status visibility.
- Manual result override.
- Score recalculation trigger.
- Audit event read access.

## UX Education Service

Provides rule education content and contextual guidance.

- Public rules summary.
- Full rules after login.
- Onboarding progress.
- Prediction scoring hints.
- Score explanations after results.

## Storage Service

Wraps Supabase Storage avatar operations.

- Validates file type/size.
- Uploads custom avatars.
- Stores public or signed URL references according to security decision in NFR Design.

## Service Orchestration Patterns

- Server Actions orchestrate application mutations.
- Prisma performs domain database access.
- Supabase SSR helpers handle auth/session.
- Supabase Edge scheduled jobs handle background football sync.
- Web Push sends run server-side only; VAPID private keys are never exposed to the browser.
- RLS policies protect Supabase-exposed tables; application-level checks still run server-side.
