# Interaction Diagrams

## User Sign-Up And Onboarding

```mermaid
sequenceDiagram
    participant U as User
    participant B as Browser
    participant A as Auth Actions
    participant S as Supabase Auth
    participant P as Profile Actions
    participant DB as PostgreSQL
    U->>B: Submit sign-up form
    B->>A: signUp
    A->>S: create user and confirmation email
    S-->>B: confirmation flow
    U->>B: Complete onboarding steps
    B->>P: nickname avatar passkey completeOnboarding
    P->>DB: create or update Profile
    P->>S: refresh session claims
    B-->>U: Redirect to intended app route
```

Text alternative: account creation happens in Supabase Auth; product identity is completed through profile actions in PostgreSQL. Completing onboarding refreshes the session so proxy claims unlock protected routes.

## Prediction Submission

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Prediction UI
    participant A as savePrediction
    participant DB as PostgreSQL
    participant V as Validation Services
    U->>UI: Enter score
    UI->>A: Submit prediction
    A->>DB: Read current user profile and match
    A->>V: Check schema and eligibility
    V-->>A: Editable or locked
    A->>DB: Upsert Prediction
    A-->>UI: Return success or error and revalidate
```

## Competition Sync And Notification Events

```mermaid
sequenceDiagram
    participant Admin as Admin
    participant Action as triggerSync
    participant Provider as football-data.org
    participant Sync as Sync Orchestrator
    participant DB as PostgreSQL
    participant Notify as Notification Events
    Admin->>Action: Trigger sync
    Action->>Sync: runCompetitionSync
    Sync->>Provider: Fetch normalized payload
    Provider-->>Sync: Teams and matches
    Sync->>DB: Upsert teams and matches
    Sync->>Notify: emitMatchNotificationEvents
    Notify->>DB: Upsert NotificationEvent rows
    Sync->>DB: Update ProviderSyncRun
```

## Result Scoring And Rankings

```mermaid
sequenceDiagram
    participant Admin as Result Mutation
    participant Scoring as Score Services
    participant DB as PostgreSQL
    participant Cache as Next Cache
    participant Ranking as Ranking Queries
    Admin->>Scoring: Result becomes final or overridden
    Scoring->>DB: Compute and persist PredictionScore rows
    Scoring->>Cache: Revalidate fixture and ranking tags
    Ranking->>DB: Aggregate scores
    Ranking-->>Admin: Updated leaderboards
```

## Web Push Notifications

```mermaid
sequenceDiagram
    participant U as User
    participant B as Browser
    participant SW as Service Worker
    participant A as Notification Actions
    participant DB as PostgreSQL
    participant D as Dispatcher
    participant W as Browser Push Service
    U->>B: Enable notifications
    B->>SW: Register sw.js
    B->>B: requestPermission and pushManager.subscribe
    B->>A: savePushSubscription
    A->>DB: Upsert PushSubscription and preferences
    D->>DB: Load pending NotificationEvent rows
    D->>W: webpush.sendNotification with VAPID
    W->>SW: push event
    SW->>U: showNotification
```

## Directed Pool Invite With Push

```mermaid
sequenceDiagram
    participant Owner as Pool Owner
    participant Action as createDirectedInvite
    participant DB as PostgreSQL
    participant Notify as Notification Events
    participant Dispatcher as Dispatcher
    Owner->>Action: Invite by nickname or email
    Action->>DB: Create PoolDirectedInvite
    Action->>Notify: Queue POOL_INVITE when recipient is resolved
    Notify->>DB: Upsert NotificationEvent
    Dispatcher->>DB: Read pending event and subscription
    Dispatcher-->>Owner: Delivery audited asynchronously
```

Text alternative: directed invites that resolve to a user can queue a push event. General invite links/tokens remain shareable but do not identify a push recipient by themselves.
