# Unit 10: Web Push Notifications — Generation Summary

## Implemented

- Added Web Push + VAPID baseline using `web-push` with provider isolation in `src/features/notifications/services/dispatcher.ts`.
- Added Prisma models and Supabase migration for:
  - `notification_preferences`
  - `push_subscriptions`
  - `notification_events`
  - `notification_deliveries`
  - `pool_directed_invites`
- Added profile settings UI for enabling browser push, managing devices and toggling each notification type.
- Added `public/sw.js` service worker for displaying push notifications and opening safe app URLs.
- Added directed pool invites by nickname/email while keeping the existing link/code flow.
- Added event producers for:
  - Match started.
  - Match finished.
  - Goal scored.
  - Directed pool invite.
  - Global rank improved after scoring.
- Added `POST /api/notifications/dispatch` to drain the outbox server-side, protected by `SYNC_TRIGGER_SECRET` when configured.

## Provider Decision

Unit 10 uses standard Web Push + VAPID for MVP. OneSignal is not required, but the provider boundary keeps migration feasible later.

## Verification

- `pnpm prisma:generate` passed.
- `pnpm exec tsc --noEmit` passed.
- `pnpm check` passed.
- `pnpm test` passed: 28 files, 115 tests.
- `pnpm lint` passed.
- `pnpm build` passed.

## Operational Notes

- Generate VAPID keys per environment: `npx web-push generate-vapid-keys`.
- Configure `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`.
- Schedule or invoke `POST /api/notifications/dispatch` after event-producing flows; use `x-sync-secret` when `SYNC_TRIGGER_SECRET` is set.
