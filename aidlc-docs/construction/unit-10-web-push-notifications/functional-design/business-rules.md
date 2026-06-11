# Unit 10: Web Push Notifications — Business Rules

> Identificador `BR-10.x`.

## Consent and Preferences

| ID | Rule |
|---|---|
| **BR-10.1** | Push permission is requested only after explicit user action in settings/onboarding. No automatic browser prompt on page load. |
| **BR-10.2** | A notification type is sent only when the user has an active subscription and the matching preference is enabled. |
| **BR-10.3** | Default preferences are opt-out for business push types until the user explicitly enables them. |
| **BR-10.4** | Disabling a preference stops future sends for that type but does not delete device subscriptions. |

## Event Types

| ID | Rule |
|---|---|
| **BR-10.5** | `MATCH_STARTED` is emitted when a match transitions to `LIVE` or the system detects kickoff reached for an eligible match. |
| **BR-10.6** | `MATCH_FINISHED` is emitted when a match transitions to `FINISHED`. |
| **BR-10.7** | `GOAL_SCORED` is emitted only when a `LIVE` match score increases relative to the previous stored score. |
| **BR-10.8** | `POOL_INVITE` is emitted only to the invited user for explicit invitations; token-only public sharing does not create a recipient-specific push. |
| **BR-10.9** | `GLOBAL_RANK_IMPROVED` is emitted only when a user's global rank number improves after scoring/recalculation. No notification is sent for no movement or rank loss. |

## Directed Pool Invitations

| ID | Rule |
|---|---|
| **BR-10.9a** | Unit 10 adds directed pool invitations by nickname or email while preserving the existing Unit 3 invite link/code flow. |
| **BR-10.9b** | Inviting by nickname resolves an existing verified user and can immediately emit `POOL_INVITE` if that user's push preference is enabled. |
| **BR-10.9c** | Inviting by email resolves an existing user by normalized email when possible. If no account exists, the invite is stored for email/link onboarding but no web push is sent until a user account is resolved. |
| **BR-10.9d** | Generic invite links/codes continue to work but do not emit push because they have no known recipient. |

## Deduplication

| ID | Rule |
|---|---|
| **BR-10.10** | Every event has a stable `dedupeKey`; repeated sync/scoring runs must not produce duplicate user-visible pushes. |
| **BR-10.11** | Goal events dedupe by match id plus resulting score, e.g. `match:abc:goal:2-1`. |
| **BR-10.12** | Match start/finish events dedupe by match id and status. |
| **BR-10.13** | Ranking improvement events dedupe by user id, scoring batch/match id, and new rank. |
| **BR-10.13a** | Directed pool invite events dedupe by pool id and invited/resolved user id, e.g. `pool-invite:{poolId}:{userId}`. |

## Authorization and Privacy

| ID | Rule |
|---|---|
| **BR-10.14** | Push recipients are resolved server-side. Client code cannot request pushes to arbitrary users. |
| **BR-10.15** | Private pool details are never included in push payloads for non-members or non-invitees. |
| **BR-10.16** | Push payloads remain minimal: title, body, URL, event id, and safe public labels only. Full details load after authenticated navigation. |
| **BR-10.17** | Server actions and RLS ensure users can only create/update/delete their own subscriptions and preferences. |

## Delivery Lifecycle

| ID | Rule |
|---|---|
| **BR-10.18** | A `404` or `410` response from a browser push service deactivates the subscription. |
| **BR-10.19** | Transient provider failures are logged with sanitized details and can be retried by the dispatcher. |
| **BR-10.20** | Notification sending is best-effort and must never block core match sync, prediction, scoring, or pool invitation mutations. |
