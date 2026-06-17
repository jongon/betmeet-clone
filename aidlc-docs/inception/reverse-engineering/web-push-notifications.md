# Web Push Notifications Analysis

## How Web Push Works In This Repository

The implementation uses the standard Web Push protocol with VAPID keys and the browser Push API. It does not depend on OneSignal, Firebase Cloud Messaging SDKs, or a paid notification vendor.

## End-To-End Flow

1. The user opens notification settings in the profile/settings UI.
2. The browser registers `public/sw.js` as the service worker.
3. The UI requests notification permission from the browser.
4. The browser creates a Push API subscription with the VAPID public key.
5. The app sends the subscription JSON to `savePushSubscription`.
6. The server stores endpoint, `p256dh`, `auth`, user agent, and active state in `PushSubscription`.
7. Business events create `NotificationEvent` outbox rows using stable `dedupeKey` values.
8. `/api/notifications/dispatch` calls `dispatchPendingNotifications`.
9. The dispatcher reads pending events, checks user preferences and active subscriptions, and sends encrypted payloads using `web-push` and VAPID private key/subject.
10. The browser vendor push service wakes `public/sw.js` with a `push` event.
11. The service worker calls `showNotification` and handles `notificationclick` by focusing or opening the target URL.

## Server-Side Components

- `src/features/notifications/actions/save-subscription.ts` - Stores or refreshes a browser subscription for the current user.
- `src/features/notifications/actions/deactivate-subscription.ts` - Deactivates an existing subscription.
- `src/features/notifications/actions/update-preferences.ts` - Persists per-event opt-in flags.
- `src/features/notifications/services/events.ts` - Queues deduplicated outbox events.
- `src/features/notifications/services/match-events.ts` - Emits match started, match finished, and goal scored events from match status/score changes.
- `src/features/notifications/services/ranking-events.ts` - Emits global rank improvement events by comparing rank snapshots.
- `src/features/notifications/services/dispatcher.ts` - Sends pending events through `web-push`, records delivery status, and deactivates expired endpoints on HTTP 404/410.
- `src/app/api/notifications/dispatch/route.ts` - HTTP trigger for dispatching the pending outbox.

## Browser Components

- `src/features/notifications/components/notification-settings-panel.tsx` - UI surface for permission/subscription/preference flows.
- `public/sw.js` - Service worker that displays received notifications and opens/focuses notification target URLs.

## Data Model

- `NotificationPreference` stores the user's opt-in booleans for `matchStarted`, `matchFinished`, `poolInvite`, `globalRankImproved`, and `goalScored`.
- `PushSubscription` stores the browser endpoint plus `p256dh` and `auth` encryption keys.
- `NotificationEvent` is the durable outbox row with event type, recipient, JSON payload, status, and dedupe key.
- `NotificationDelivery` records per-subscription send results and provider error metadata.

## Event Types

- `MATCH_STARTED` - Queued when a match transitions into `LIVE`.
- `MATCH_FINISHED` - Queued when a match transitions into `FINISHED`.
- `GOAL_SCORED` - Queued when a live match's total score increases.
- `GLOBAL_RANK_IMPROVED` - Queued when a user's dense global rank improves after scoring.
- `POOL_INVITE` - Queued for directed invites when a recipient user is resolved.

## Required Environment Variables

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Used by the browser when subscribing.
- `VAPID_PRIVATE_KEY` - Used by the server to sign push sends.
- `VAPID_SUBJECT` - Contact subject for VAPID, typically `mailto:` or an origin URL.
- `SYNC_TRIGGER_SECRET` - Optional shared secret for the dispatcher route.

## Operational Notes

- Dispatch is not automatic by itself; an external scheduler, cron, admin operation, or Supabase/Vercel scheduled trigger must call `/api/notifications/dispatch`.
- If VAPID variables are missing, `dispatchPendingNotifications` returns zero counts and does not throw.
- Event producers use dedupe keys, so repeated sync/result processing should not create duplicate events for the same user/event condition.
- Delivery is best-effort. Notification failures do not block competition sync.
- Expired browser endpoints return 404/410 and are marked inactive.
- Browser support and permission behavior vary. Users can deny permissions or revoke them outside the app.

## Current Limitations

- Notification copy is currently hardcoded in Spanish in event services.
- Service worker logic is intentionally small and does not implement advanced action buttons, notification grouping, or offline deep-link reconciliation.
- No vendor dashboard exists because this is raw Web Push; observability is through database delivery rows and app logs.
- Repeated transient failures are recorded but do not currently implement exponential backoff.
