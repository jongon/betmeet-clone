# Unit 10: Web Push Notifications — Tech Stack Decisions

## Provider Baseline

Use **standard Web Push + VAPID** for v1.

Rationale:
- Free at MVP scale.
- Works with the existing Next.js + Supabase stack.
- Avoids adding OneSignal SDK/vendor dependency before there is a clear need.
- Keeps user preferences and authorization in our own database.

## Alternatives

| Option | Use Later If |
|---|---|
| OneSignal | Need dashboard, campaigns, analytics, segmentation, mobile push native, or non-engineering operators. |
| Firebase Cloud Messaging | Firebase is adopted elsewhere or Android/mobile push becomes first-class. |
| Novu/self-hosted | Need multi-channel notification orchestration and accept operating more infrastructure. |

## Library Decision

Use a small server-side Web Push library only if implementation confirms Node runtime compatibility on the selected dispatcher runtime. If Edge runtime compatibility is required, use a provider-compatible fetch/signing approach or run dispatch in Node-compatible serverless functions.

Before implementation, consult current docs for the chosen Web Push library/runtime compatibility.
