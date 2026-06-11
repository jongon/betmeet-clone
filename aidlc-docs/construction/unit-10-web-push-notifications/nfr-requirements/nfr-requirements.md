# Unit 10: Web Push Notifications — NFR Requirements

## Security

- VAPID private key is server-only and never shipped to the browser.
- Push subscription endpoints and keys are treated as user-owned sensitive data.
- Payloads are minimal and must not include private pool details, prediction details or personal data beyond safe display text.
- All writes require authenticated user and object ownership checks.
- RLS denies cross-user reads/writes for subscriptions and preferences.

## Privacy and Consent

- Browser permission is explicit opt-in.
- Per-event preferences are opt-in and reversible.
- Users can remove subscriptions/devices.
- Logs store sanitized provider errors only.

## Reliability

- Sending is best-effort and must not block sync/scoring/pool flows.
- Repeated sync/scoring runs must be idempotent via `dedupeKey`.
- Invalid endpoints are automatically deactivated.
- Transient send failures are retryable by dispatcher.

## Performance

- Service worker registration must not delay first render.
- Notification settings UI should be lazy-loaded/profile-scoped.
- Dispatch should batch pending events to avoid excessive serverless/edge invocations.

## Cost and Scalability

- Baseline must run on existing Vercel + Supabase stack plus browser push services.
- No paid push provider is required for MVP scale.
- Provider adapter keeps migration path open if operational needs exceed self-managed Web Push.
