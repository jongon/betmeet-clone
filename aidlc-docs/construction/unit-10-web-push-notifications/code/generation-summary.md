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

## Refine Unit 43: Onboarding step + dispatch on sync (2026-06-18)

> Delta documental sobre Unit 10 sin cambios de código. Dos gaps identificados: (1) el usuario solo puede activar push desde `/settings/profile`; (2) `dispatchPendingNotifications` nunca se invoca tras sync.

- **FR-REFINE-43.1 — Paso de notificaciones en onboarding**: nuevo paso "Notificaciones" entre reglas y passkey (nickname → avatar → reglas → notificaciones → passkey), reutilizando `NotificationSettingsPanel`. Skippable; 5 tipos activados por defecto al activar desde onboarding.
- **FR-REFINE-43.2 — Dispatch en sync admin**: `triggerSync()` llamará `dispatchPendingNotifications()` al final para drenar el outbox. Best-effort: no revierte sync/scoring. Sin nuevos tipos de evento ni cambios en el dispatcher.
- Ver `aidlc-docs/inception/requirements/requirements.md` (Épica 43), `stories.md` (US-43.1, US-43.2) y `aidlc-state.md` (Unit 43).
