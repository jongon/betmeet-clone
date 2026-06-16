# Unit 4: Competition Data and API Sync — Tech Stack Decisions

## Context

The stack is fixed: Next.js 16 App Router, TypeScript, Prisma, Supabase/PostgreSQL, Vercel, pnpm, Biome. Unit 4 adds football-data.org integration, local fixture seed data, local SVG flags, sync logs, and scheduled synchronization.

---

## Decision 1: football-data.org Adapter Boundary

**Choice**: Implement football-data.org behind a provider adapter interface.

**Rationale**:
- Keeps provider-specific status codes, response shapes, and IDs out of domain logic.
- Enables future replacement or fallback providers without changing fixture UI, predictions, or scoring.
- Supports normalized idempotent upserts.

**Implementation approach**:
- `src/features/competition/services/providers/football-data.ts` for provider-specific fetch/normalize code.
- Domain services consume normalized DTOs only.
- Persist `rawStatus` for diagnostics, but not raw payloads by default.

---

## Decision 2: Server-Side Secret Handling

**Choice**: `FOOTBALL_DATA_KEY` lives in server-side env/secret manager only.

**Rationale**:
- Matches Security Baseline and avoids accidental browser exposure.
- Simple enough for MVP pequeño.

**Implementation approach**:
- Never use `NEXT_PUBLIC_FOOTBALL_DATA_KEY`.
- Provider adapter reads from server runtime only.
- Missing key produces sanitized `ProviderSyncLog` failure.
- Supabase Vault can be adopted later if Infrastructure Design chooses it; not required for v1.

---

## Decision 3: Supabase Edge Functions as Sync Baseline

**Choice**: Design NFR around Supabase Edge Functions + scheduled/cron execution for sync.

**Rationale**:
- Keeps data sync close to Supabase/Postgres.
- Avoids relying on user traffic to refresh sports data.
- Aligns with the user's preference and functional requirement for scheduled jobs.

**Implementation approach**:
- Exact implementation is finalized in Infrastructure Design.
- Code Generation should still isolate sync logic so it can be triggered manually in tests/dev.
- Persist all sync attempts to `ProviderSyncLog`.

---

## Decision 4: DB as Read Source + Short Server Cache

**Choice**: Users read fixture data from Postgres via server-side queries; provider data enters only through sync. Cache fixture reads with short revalidation depending on match status.

**Rationale**:
- Protects provider quota and secrets.
- For MVP pequeño, Postgres + reasonable indexes + short cache is sufficient.
- Allows stale-but-usable behavior when provider sync fails.

**Implementation approach**:
- Future/non-live fixture queries can use cache/revalidate.
- Live windows use no-store or very short revalidate.
- Add indexes for active competition, phase ordering, status, kickoff, provider IDs.

---

## Decision 5: Sanitized Sync Logs, No Raw Payload Persistence

**Choice**: Store normalized data and sanitized metadata; do not persist raw provider payloads by default.

**Rationale**:
- Reduces storage, PII/secret risk, and log noise.
- Provider payloads may be large and unstable.

**Implementation approach**:
- `ProviderSyncLog` stores scope, status, started/finished timestamps, counts, sanitized error, safe metadata.
- Retention target: 90 days.
- Payload capture, if needed, is temporary/local and not default production behavior.

---

## Decision 6: Local Flag Assets in `public/flags/`

**Choice**: Copy only required SVG flags into `public/flags/` with reproducible script/docs.

**Rationale**:
- No runtime dependency on GitHub/CDN.
- Stable display and better privacy/performance.
- Supports special keys like `gb-eng`.

**Implementation approach**:
- Team seed stores `fifaCode`, `flagKey`, `flagPath`.
- UI uses local `flagPath` and falls back to FIFA code if missing.
- Code Generation should avoid adding a runtime flag package unless needed.

---

## Decision 7: Fixture UI Mostly Server Components

**Choice**: Render `/matches` mostly as Server Components with lightweight client filters only if needed.

**Rationale**:
- Meets JS budget < 150 KB gzip.
- Fixture is mostly read-only data display.
- Mobile performance matters more than rich client interactivity in MVP.

**Implementation approach**:
- Query params for filters where possible.
- Use semantic HTML and text status labels.
- Avoid client-side polling in Unit 4 unless explicitly required later.

---

## Decision 8: Testing Strategy for Sync and Status Logic

**Choice**: Unit-test normalization, status mapping, idempotent upsert policy, first-kickoff lookup, and stale/degradation behavior.

**Rationale**:
- Provider sync failures are high-risk and hard to validate manually.
- Unit 5/6 depend on match status/result correctness.

**Implementation approach**:
- Mock provider adapter responses.
- Test status mapping from representative football-data.org raw statuses.
- Test duplicate seed/sync upserts do not create duplicates.
- Test manual override preservation policy.

---

## Summary Table

| Concern | Decision |
|---|---|
| Provider integration | football-data.org adapter boundary |
| Secrets | Server-side env/secret only, never `NEXT_PUBLIC` |
| Sync execution | Supabase Edge Functions + cron as baseline |
| Read source | Postgres normalized data, not provider direct |
| Cache | Short server-side revalidate; live very short/no-store |
| Logs | Sanitized `ProviderSyncLog`, 90 days, no raw payload default |
| Flags | Local SVG assets in `public/flags/` |
| UI performance | Mostly Server Components, <150 KB JS gzip |
| Tests | Provider normalization/status/upsert/lock behavior |
