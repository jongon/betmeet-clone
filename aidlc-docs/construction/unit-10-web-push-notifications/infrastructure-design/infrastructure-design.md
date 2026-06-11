# Unit 10: Web Push Notifications — Infrastructure Design

## Runtime

- Browser: Service Worker + Push API.
- App server: Next.js Server Actions for subscription/preferences.
- Dispatcher: server-side job, route handler, or Supabase Edge Function depending on Web Push library/runtime compatibility.
- Database: Supabase PostgreSQL tables for preferences, subscriptions, events and deliveries.
- Directed pool invites: additional table or extension around Unit 3 invite tokens to map nickname/email invites to a recipient when available.

## Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public | Used by browser when subscribing. |
| `VAPID_PRIVATE_KEY` | Server only | Signs Web Push requests. |
| `VAPID_SUBJECT` | Server only | Contact subject required by VAPID. |

## Data Protection

- RLS on all notification tables.
- Users can read/update their own preferences and subscriptions only.
- Event production and dispatch use server-side privileges.
- Logs and delivery failures are sanitized.

## Dispatch Strategy

1. Core domain flows create deduplicated `NotificationEvent` rows.
2. Dispatcher drains pending rows in small batches.
3. Dispatcher checks preferences at send time.
4. Dispatcher sends to all active subscriptions for the recipient.
5. Dispatcher records delivery attempts and deactivates invalid endpoints.

## Operational Notes

- Generate VAPID keys per environment.
- Preview environments can disable dispatch while allowing settings UI/subscription tests.
- OneSignal is not required for v1, but the provider adapter keeps migration feasible.
- Existing invite links remain valid; directed invites add recipient resolution for push and should reuse the join token where possible.
