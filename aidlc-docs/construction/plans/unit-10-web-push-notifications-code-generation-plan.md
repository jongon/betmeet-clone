# Unit 10: Web Push Notifications — Code Generation Plan

## Scope

Implement configurable browser push notifications using standard Web Push + VAPID. Do not implement OneSignal in v1.

## Steps

1. Add Prisma models and Supabase migration/RLS for notification preferences, subscriptions, events and optional deliveries.
2. Add notification feature module under `src/features/notifications/` with schemas, types, queries, services and server actions.
3. Add VAPID env validation and provider adapter interface with `standard-web-push` implementation.
4. Add service worker and client subscription helper.
5. Add notification settings UI in profile/settings.
6. Add event producers for Unit 3 explicit pool invitations, Unit 4 match status/score transitions and Unit 6 global ranking improvement.
7. Extend Unit 3 invite UI/actions with directed invitations by nickname/email while preserving existing link/code invites.
8. Add dispatcher for pending notification events with dedupe, preference checks, retries and invalid endpoint cleanup.
9. Add tests for preferences, subscription authorization, directed invite resolution, event dedupe and provider failure handling.
10. Update documentation and run verification (`tsc`, tests, Biome, build as applicable).

## Acceptance Criteria

- Users can enable/disable browser push by device.
- Users can configure all five requested notification types.
- Match start, match finish, pool invite, global rank improvement and goal scored events are supported.
- Pool invite push is sent only for directed nickname/email invites with a resolved user; generic links remain supported without push.
- Repeated sync/scoring runs do not duplicate pushes.
- Push payloads are minimal and links re-authorize in the app.
- No paid push provider is required for MVP.
