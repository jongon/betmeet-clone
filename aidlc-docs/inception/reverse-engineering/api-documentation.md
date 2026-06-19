# API Documentation

## REST APIs

### Notification Dispatcher

- **Method**: `POST`
- **Path**: `/api/notifications/dispatch`
- **Purpose**: Dispatch pending Web Push notification events from the durable outbox.
- **Request**: Optional `x-sync-secret` header when `SYNC_TRIGGER_SECRET` is configured. No JSON body is required.
- **Response**: JSON object `{ sent: number, failed: number, skipped: number }` or `{ error: "Unauthorized" }` with `401`.
- **Runtime**: Node.js, required because `web-push` is server-only.

### Scheduled Sync & Scoring (Unit 50)

- **Method**: `POST`
- **Path**: `/api/cron/sync?scope=<SCOPE>`
- **Purpose**: Automated competition sync + scoring + notification dispatch, invoked by Supabase pg_cron via pg_net. Reuses the same orchestration as the admin manual sync (`runScheduledSync`).
- **Request**: `scope` query param (`FIXTURES | LIVE_STATUS | RESULTS | FULL | CLEANUP`). `x-sync-secret` header required when `SYNC_TRIGGER_SECRET` is configured.
- **Response**: `{ ok: true, scope }` (or `{ ok: true, scope, skipped: true }` when `LIVE_STATUS` short-circuits with no live/imminent match); `{ error }` with `401` (bad secret) / `400` (bad scope); `{ ok: false, scope, error }` with `502` (sync failure).
- **Runtime**: Node.js.

### CSP Report Intake

- **Method**: route exists at `/api/csp-report`
- **Path**: `/api/csp-report`
- **Purpose**: Receive Content Security Policy reports.
- **Request/Response**: Implementation should be reviewed directly in `src/app/api/csp-report/route.ts` for exact shape.

### Supabase Auth Callback

- **Method**: route exists at `/auth/callback`
- **Path**: `/auth/callback`
- **Purpose**: Complete Supabase OAuth/PKCE flows and redirect users to the intended destination.
- **Request/Response**: Query parameters are provided by Supabase Auth; response is a redirect.

### Supabase Auth Confirm

- **Method**: route exists at `/auth/confirm`
- **Path**: `/auth/confirm`
- **Purpose**: Verify token-hash email actions for confirmation/recovery/email changes.
- **Request/Response**: Query parameters are provided by Supabase Auth templates; response is a redirect.

## Internal APIs

- **Auth Server Actions**: `signIn`, `signUp`, `signOut`, `forgotPassword`, `resetPassword`, `changeEmail`, `changePassword`, `deleteAccount`, `mfaEnroll`, `mfaVerify`, `mfaDisable`, `passkeySignIn`, `resendConfirmation`, `changeUnconfirmedEmail`.
- **Profile Server Actions**: `checkNicknameAvailability`, `setNickname`, `setAvatarFromDefaultSet`, `setAvatarFromGoogle`, `createAvatarUploadUrl`, `setAvatarFromUpload`, `completeOnboarding`, `setLocale`.
- **Pool Server Actions**: `createPool`, `joinPublicPool`, `joinPoolByToken`, `leavePool`, `kickMember`, `deletePool`, `createDirectedInvite`.
- **Prediction Server Action**: `savePrediction` validates session, onboarding, schema, and edit eligibility before upserting prediction data.
- **Admin Server Actions**: `triggerSync`, `forceMatchResult`, `revertMatchOverride` enforce admin authorization and revalidate result views.
- **Notification Server Actions**: `updateNotificationPreferences`, `savePushSubscription`, `deactivatePushSubscription` manage opt-ins and browser device endpoints.
- **Competition Sync Service**: `runCompetitionSync(provider, scope, window)` validates normalized provider payloads, upserts teams/matches, and records `ProviderSyncRun` status.
- **Scoring Service**: `computeScore(example)` and `derivePenaltyWinner(home, away)` provide deterministic scoring behavior.
- **Notification Services**: `queueNotificationEvent`, `queueNotificationEvents`, `emitMatchNotificationEvents`, `emitGlobalRankImprovedEvents`, `dispatchPendingNotifications` implement event outbox and delivery.

## Data Models

### Profile

- **Fields**: UUID id, nickname base/discriminator, avatar URL/source, verification status, MFA flag, nickname cooldown/change count, onboarding flag, locale, soft-delete timestamp.
- **Relationships**: Owns pools, memberships, predictions, prediction scores, notification preferences/subscriptions/events, directed invites.
- **Validation**: Unique nickname pair, deleted profile filtering, onboarding gates in server actions.

### Pool And PoolMembership

- **Fields**: Pool name/type/capacity/invite token/owner; membership pool/user/joined/archive timestamps.
- **Relationships**: Pool owner profile, memberships, directed invites.
- **Validation**: Unique invite token, unique member per pool, capacity and owner checks in actions.

### Competition, CompetitionPhase, Team, Match

- **Fields**: Competition metadata; phase order/type/group; team FIFA/flag/provider data; match provider ID, kickoff, status, score, penalty score, winner, override metadata.
- **Relationships**: Competition has phases and matches; matches link teams and predictions.
- **Validation**: Unique provider match ID, unique competition match number, status mapping and provider normalization.

### Prediction And PredictionScore

- **Fields**: Prediction user/match, scores, optional penalty winner, lock metadata; score matched case, base points, penalty points, total.
- **Relationships**: Prediction belongs to user and match; score is one-to-one with prediction.
- **Validation**: Unique prediction per user/match; edit eligibility before kickoff/lock; deterministic scoring service.

### NotificationPreference, PushSubscription, NotificationEvent, NotificationDelivery

- **Fields**: Per-type opt-ins; endpoint/encryption keys/user agent/active state; outbox event type/dedupe/payload/status; delivery status/provider response/error.
- **Relationships**: All attach to profile; deliveries attach to event and subscription.
- **Validation**: Unique endpoint and dedupe key; subscriptions deactivate on 404/410; preferences checked at dispatch time.
