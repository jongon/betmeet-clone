# Unit 10: Web Push Notifications — Domain Entities

## Scope

Unit 10 adds configurable browser push notifications. It does not replace Unit 9 transactional email and does not alter approved core behavior in Units 1–8.

## Entities

### NotificationPreference

Per-user switchboard for notification types.

| Field | Purpose |
|---|---|
| `userId` | Owner profile/auth user. Unique. |
| `matchStarted` | Receive match-start push notifications. |
| `matchFinished` | Receive match-finished push notifications. |
| `poolInvite` | Receive pool/league invitation push notifications. |
| `globalRankImproved` | Receive global ranking improvement notifications. |
| `goalScored` | Receive live goal notifications. |
| `updatedAt` | Audit timestamp for settings changes. |

Defaults should be safe: all business push types disabled until the user explicitly opts in.

### PushSubscription

One browser/device subscription for one user.

| Field | Purpose |
|---|---|
| `id` | Internal id. |
| `userId` | Owner. |
| `endpoint` | Push endpoint URL. Unique. |
| `p256dh` | Browser public key. |
| `auth` | Browser auth secret. |
| `userAgent` | Optional coarse browser/device label for settings UI. |
| `isActive` | False after unsubscribe or invalid endpoint response. |
| `lastSuccessAt` | Last successful delivery timestamp. |
| `lastFailureAt` | Last failed delivery timestamp. |
| `failureReason` | Sanitized failure reason. |
| `createdAt` / `updatedAt` | Lifecycle timestamps. |

### NotificationEvent

Outbox/deduplication record for a business event that may produce one or more sends.

| Field | Purpose |
|---|---|
| `id` | Internal id. |
| `type` | `MATCH_STARTED`, `MATCH_FINISHED`, `POOL_INVITE`, `GLOBAL_RANK_IMPROVED`, `GOAL_SCORED`. |
| `dedupeKey` | Stable unique key, e.g. `match:{id}:goal:{home}-{away}`. |
| `recipientUserId` | User allowed to receive the event. |
| `payload` | Minimal JSON: title/body/url/entity ids needed for routing. |
| `status` | `PENDING`, `SENT`, `FAILED`, `SKIPPED`. |
| `createdAt` / `processedAt` | Dispatch lifecycle. |

### PoolDirectedInvite

Extension to Unit 3 pool invitations so push has a known recipient while preserving existing link/code invites.

| Field | Purpose |
|---|---|
| `id` | Internal id. |
| `poolId` | Pool being invited to. |
| `invitedUserId` | Resolved user when inviting by nickname or known email. Nullable until accepted/claimed if email has no account yet. |
| `invitedEmailHash` | Normalized hashed email for pending invites to users who may not have an account. |
| `invitedNickname` | Nickname/discriminator input used for lookup, when applicable. |
| `inviteToken` | Existing Unit 3 token/link reused for join flow. |
| `createdByUserId` | Pool owner/admin who created invite. |
| `status` | `PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED`. |
| `createdAt` / `acceptedAt` | Lifecycle timestamps. |

Only invites with a resolved `invitedUserId` can create an immediate push notification.

### NotificationDelivery

Optional per-subscription send attempt record for diagnostics.

| Field | Purpose |
|---|---|
| `eventId` | NotificationEvent. |
| `subscriptionId` | PushSubscription attempted. |
| `status` | `SENT`, `FAILED`, `SKIPPED`. |
| `providerStatusCode` | Sanitized response code. |
| `errorMessage` | Sanitized failure text. |
| `attemptedAt` | Attempt timestamp. |

## Provider Interface

`PushProvider` abstracts delivery:

- `send(subscription, payload): Promise<PushSendResult>`.
- v1 implementation: `standard-web-push` using VAPID.
- Future implementations: OneSignal, FCM, Novu, or self-hosted gateway.
