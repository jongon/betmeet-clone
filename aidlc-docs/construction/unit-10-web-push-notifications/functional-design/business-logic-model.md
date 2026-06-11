# Unit 10: Web Push Notifications — Business Logic Model

## BL-10.1 Subscription Lifecycle

1. User opens notification settings.
2. UI verifies browser support for Service Worker + Push API.
3. User clicks enable.
4. Browser permission is requested.
5. If granted, client subscribes using `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
6. Server action stores/updates `PushSubscription` for the current user.
7. User can later deactivate one device or all devices.

## BL-10.2 Preference Update

1. User toggles notification type switches.
2. Server action validates authenticated user.
3. Preferences are upserted in `NotificationPreference`.
4. UI reflects saved state with optimistic or server-confirmed feedback.

## BL-10.3 Match Event Production

1. Unit 4 sync updates match status/scores.
2. Notification event producer compares previous and new match snapshots.
3. For start/finish/goal events, it resolves eligible recipients.
4. It upserts `NotificationEvent` rows by `dedupeKey`.
5. Dispatch happens asynchronously or after the core sync transaction completes.

## BL-10.4 Pool Invite Production

1. Pool owner/admin creates either the existing generic invite link/code or a new directed invite by nickname/email.
2. For nickname invites, the system resolves the target profile/user.
3. For email invites, the system normalizes the email and resolves an existing account when present; otherwise the invite remains pending for future acceptance/onboarding without push.
4. If a target user is resolved, event producer creates `POOL_INVITE` for that user only.
5. Token-only sharing links continue to work but do not produce push events because no recipient is known.

## BL-10.5 Global Ranking Improvement Production

1. Unit 6 recalculates scores/rankings.
2. Ranking service compares previous and new global rank snapshots.
3. Users with improved rank receive `GLOBAL_RANK_IMPROVED` events if preference is enabled.
4. Dense/standard ranking details remain implementation-specific to the global ranking read model; the event only needs old/new positions.

## BL-10.6 Dispatch

1. Dispatcher selects pending events.
2. For each event, it loads active subscriptions and preferences for the recipient.
3. It skips disabled preferences and inactive subscriptions.
4. It sends via `PushProvider`.
5. It records delivery attempts and marks event sent/failed/skipped.
6. Invalid endpoints are deactivated.
