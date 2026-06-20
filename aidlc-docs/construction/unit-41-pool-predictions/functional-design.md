# Functional Design — Unit 41: Predicciones visibles dentro del pool

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-41.1 | requirements | Visibilidad desde kickoff |
| FR-REFINE-41.2 | requirements | Nueva pestaña "Predicciones" en `/pools/[id]` |
| FR-REFINE-41.3 | requirements | Vista por jornada/día (filas=miembros, columnas=partidos) |
| FR-REFINE-41.4 | requirements | Sin timestamps |
| FR-REFINE-41.5 | requirements | Sin cambios en modelo de datos |
| US-41.1 | stories | Ver predicciones de otros miembros del pool |

## 1. Business Logic Model

### 1.1 Core Algorithm: Query + Transform + Render

```
Input: poolId (from route params) + session (implicit)
Output: Pool detail page with "Predicciones" tab

1. Verify membership: getPoolDetail(poolId) — same gate as existing page
2. If member, fetch: getPoolMemberPredictions(poolId)
3. Group predictions by member within each day
4. Render: Tabs(Clasificación | Predicciones | Miembros)
   - Tab "Predicciones": PoolPredictionsView(days)
```

### 1.2 Query Logic: `getPoolMemberPredictions(poolId)`

```
Purpose: Fetch all predictions for pool members where match has started.

Steps (single Prisma query):
1. Verify membership (read current userId, check membership in pool)
2. Fetch predictions WHERE:
   - prediction.userId IN (member userIds for poolId)
   - match.kickoffAt <= now()  ← "match has started"
3. Include:
   - PredictionScore (matchedCase, basePoints, penaltyPoints, totalPoints)
   - Match (matchNumber, kickoffAt, status, homeTeam, awayTeam, 
           homeScore, awayScore, homePlaceholder, awayPlaceholder, phase)
   - Profile (nicknameBase, nicknameDiscriminator, avatarUrl)
4. Transform: group by match kickoff day, then by member within each day
5. Return structured data for the component
```

### 1.3 Data Transform: `toPoolPredictionsView(input)`

```
Pure function, no DB access.

Input: { members: PoolMemberSummary[], predictions: PredictionRow[], scores: ScoreRow[] }
Output: PoolPredictionsViewData { days: DayPredictionGroup[] }

Where DayPredictionGroup = {
  dayKey: string | null,     // "2026-06-11" in the same local-day timezone as /matches
  label: string,             // "Jueves, 11 de junio"
  matches: MatchColumn[],    // columns of the table
  memberRows: MemberRow[],   // rows of the table (ordered by leaderboard rank)
}

MemberRow = {
  userId, nickname, avatarUrl,
  cells: Record<matchId, PredictionCell>,  // one cell per match column
}

PredictionCell = {
  prediction: { homeScore, awayScore } | null,  // null = no prediction
  points: { totalPoints, matchedCase } | null,  // null = not yet scored (LIVE)
}
```

## 2. Domain Entities

### 2.1 New Interface: `PoolMemberPrediction`

```ts
/** One member's prediction for one match with its score. */
interface PoolMemberPrediction {
  matchId: string;
  matchNumber: number | null;
  kickoffAt: string | null;
  matchStatus: string;          // SCHEDULED | LIVE | FINISHED | ...
  homeTeam: TeamView | null;
  awayTeam: TeamView | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  homeScore: number | null;     // actual result (only FINISHED)
  awayScore: number | null;
  phaseName: string;
  phaseType: string;

  // member info
  userId: string;
  nickname: string;             // formatted "base#discriminator"
  avatarUrl: string | null;

  // prediction (null if member didn't predict this match)
  predictedHome: number | null;
  predictedAway: number | null;

  // score (null if match not yet scored)
  totalPoints: number | null;
  matchedCase: string | null;   // "EXACT" | "RESULT" | "PARTIAL" | "MISS"
}
```

### 2.2 New Interface: `PoolPredictionsViewProps`

```ts
interface PoolPredictionsViewProps {
  predictions: PoolMemberPrediction[];
  members: PoolMemberSummary[];  // for ordering (matches leaderboard order)
}
```

### 2.3 Existing Types Reused

| Type | Source | Usage |
|------|--------|-------|
| `PoolMemberSummary` | `features/pools/types.ts` | Member identity, ordering |
| `TeamView` | `features/competition/types.ts` | Team flags and names |
| `ScoreBreakdown` (optional) | `features/scoring/compute-score.ts` | Not used in this component (only totals shown) |
| `FixtureDayGroup` (concept) | `features/predictions/services/fixture-by-day.ts` | Day grouping pattern is reused conceptually; the predictions view uses its own grouping because the structure is different (members × matches, not just matches) |

## 3. Business Rules

### BR-41.1 — Membership gate
Only pool members can see the predictions tab. The existing `getPoolDetail(poolId)` call returns `null` for non-members (BR-3.28), triggering `notFound()`. The predictions query itself also verifies membership as defense-in-depth.

**Rationale**: Reuses existing authorization. No new RLS or auth logic.

### BR-41.2 — Visibility window
A prediction is visible to pool peers iff `match.kickoffAt <= now()` (the match has started). This is equivalent to `prediction.lockedAt IS NOT NULL` because the lock mechanism fires at kickoff (BL-5.3).

**Edge case**: Matches with `kickoffAt = null` (TBD knockout teams) are never visible because they haven't started.

**Rationale**: User decision — "Desde que empieza el partido es visible, y también seguirá siendo visible cuando termine."

> **Nota (Unit 48 / Unit 53)**: Unit 48 (BR-48.16) eliminó el filtro `kickoffAt <= now` de `getPoolMemberPredictions` para permitir al viewer navegar y editar sus propios overrides de partidos futuros — lo que **expuso temporalmente** las predicciones futuras de los demás miembros (regresión de esta regla). **Unit 53 (BR-53.1, 2026-06-20)** restaura la garantía anti-sesgo acotándola: el filtro `kickoffAt <= now` vuelve a aplicar a los **demás** miembros (enmascarado server-side), mientras que el viewer sigue viendo sus propias predicciones futuras. Ver `construction/unit-53-pool-predictions-hide-future/functional-design.md`.

### BR-41.3 — Member ordering
Members in the predictions table are ordered by leaderboard rank (total points descending). Members with equal points follow the same dense-ranking tiebreak as the leaderboard (nickname ascending).

**Rationale**: Consistent with the leaderboard; natural for comparing predictions against performance.

### BR-41.4 — Day grouping
Prediction days are grouped by the same local calendar day used by the `/matches` fixture grouping (FR-REFINE-16.2 + Unit 42), not by UTC. Days are shown in reverse chronological order (newest first = today's predictions first, older days last).

**Rationale**: User decision — "El orden de las predicciones deben verse de las mas nuevas a las mas viejas. Las de hoy se ven primero, las de mañana despues."

### BR-41.5 — Cell display rules
| State | Display |
|-------|---------|
| Member predicted + match scored | `golesLocal - golesVisitante` + points badge (e.g., "2 - 1" + badge "3 pts") |
| Member predicted + match LIVE (not scored) | `golesLocal - golesVisitante` + "—" for points |
| Member did NOT predict + match scored | "—" for prediction + "0 pts" (no prediction = no score) |
| Member did NOT predict + match LIVE | "—" for prediction + "—" for points |
| Match FINISHED with no result (cancelled/postponed) | Prediction shown (if exists), "—" for points |

**Rationale**: Clear visualization — the prediction is always visible when allowed, points follow when available.

> **Nota (Unit 56, 2026-06-20)**: se añade un estado de celda **pre-ingreso** (hermano del `hidden` de Unit 53). Una celda `(miembro, partido)` con `partido.kickoffAt < miembro.joinedAt` se muestra **vacía** con un ícono distinto al candado (`CalendarOff`) + "Aún no estaba en la liga", para no mostrar puntos heredados del global que ya no cuentan en el leaderboard del pool (Unit 55). Aplica a todos incl. el viewer; las columnas se conservan. Ver `construction/unit-56-pool-predictions-prejoin/functional-design.md`.

### BR-41.6 — Empty state
If no matches have started yet (e.g., pool created before tournament begins), the "Predicciones" tab shows an empty state: "Aún no hay predicciones disponibles. Las predicciones serán visibles cuando comiencen los partidos."

**Rationale**: User expectation management — explains why the tab is empty.

### BR-41.7 — Tab default
The default tab on `/pools/[id]` remains "Clasificación" (the existing view). "Predicciones" is the second tab. "Miembros" is the third tab. Tab state is client-side only (no URL query param).

**Rationale**: Minimal change to existing behavior. Users who don't care about predictions see the same page as before.

### BR-41.8 — Sidebar persistence
The sidebar (InviteShare, DirectedInviteForm, PoolActions) is visible across all three tabs, same styles and behavior as current page.

**Rationale**: Pool management actions are relevant regardless of which tab is active.

## 4. Frontend Components

### 4.1 Page Restructure: `src/app/(app)/pools/[id]/page.tsx`

**Current**: Two-column grid (leaderboard/members + sidebar).
**New**: Same layout, but left column uses Tabs component.

```
<main>
  <header>...</header>         {/* unchanged: pool name, badge, capacity */}
  <Tabs defaultValue="ranking">
    <TabsList>
      <TabsTrigger value="ranking">Clasificación</TabsTrigger>
      <TabsTrigger value="predictions">Predicciones</TabsTrigger>
      <TabsTrigger value="members">Miembros</TabsTrigger>
    </TabsList>

    <div class="grid lg:grid-cols-[1fr_22rem]">
      <div>  {/* left column */}
        <TabsContent value="ranking">
          {/* existing: leaderboard section */}
        </TabsContent>
        <TabsContent value="predictions">
          <PoolPredictionsView predictions={...} members={...} />
        </TabsContent>
        <TabsContent value="members">
          {/* existing: <MemberList pool={pool} /> */}
        </TabsContent>
      </div>

      <aside>  {/* right column — unchanged */}
        <InviteShare ... />
        <DirectedInviteForm ... />
        <PoolActions ... />
      </aside>
    </div>
  </Tabs>
</main>
```

**Props change**: The page now receives `pool`, `leaderboard`, and optionally `predictions` data.

**Data fetching**: Parallelize `getPoolDetail`, `getPoolLeaderboard`, and `getPoolMemberPredictions` via `Promise.all`.

### 4.2 New Component: `PoolPredictionsView`

**File**: `src/features/pools/components/pool-predictions-view.tsx`
**Type**: Server Component (async — reads data from props, no interactivity needed)
**i18n**: `useDictionary()` via prop or imported from parent

```tsx
interface PoolPredictionsViewProps {
  predictions: PoolMemberPrediction[];  // raw rows from query
  members: PoolMemberSummary[];         // for ordering + avatars/nicks
}
```

**Rendering logic**:
1. Group `predictions` by member and by match day using the same local-day timezone contract as `/matches`
2. For each day (chronological):
   - Render day header: `<h3 className="...">{dayLabel}</h3>`
   - Render scrollable table:
     ```
     <div className="overflow-x-auto">
       <table>
         <thead>
           <tr>
             <th className="sticky left-0">Miembro</th>
             {matches.map(m => <th>{homeFifa vs awayFifa}</th>)}
           </tr>
         </thead>
         <tbody>
           {members.map(member =>
             <tr>
               <td className="sticky left-0">
                 <Avatar /> {nickname}
               </td>
               {matches.map(match =>
                 <td>
                   {cell.prediction
                     ? `${cell.prediction.homeScore} - ${cell.prediction.awayScore}`
                     : "—"}
                   {cell.points
                     ? <Badge variant="secondary">{cell.points.totalPoints} pts</Badge>
                     : "—"}
                 </td>
               )}
             </tr>
           )}
         </tbody>
       </table>
     </div>
     ```

3. **Mobile adaptation**: `overflow-x-auto` on the table container allows horizontal scroll. Left column (member names) uses `sticky left-0` with background to stay visible while scrolling matches.

4. **Empty state**: If no predictions exist (no matches started), show empty state message.

### 4.3 Match column labels

For each match column, use `homeTeam?.fifaCode ?? homePlaceholder ?? "?"` vs `awayTeam?.fifaCode ?? awayPlaceholder ?? "?"`, format as `XXX vs YYY`. If the match is FINISHED, append the actual score below the label: `BRA 2-1 ARG`.

### 4.4 Points badge

For matches that are FINISHED with scores, show a badge with `totalPoints`. For LIVE matches (not yet scored), show "—" (pending). For matches where a member has no prediction, the cell shows "—" for both prediction and points.

**Color coding** (optional enhancement, documented for future):
- EXACT: green badge (`bg-green-100 text-green-800`)
- RESULT: blue badge
- PARTIAL: yellow badge
- MISS: gray badge
- Pending: muted text

For the initial implementation, use a single `secondary` badge variant for all scores (simpler, consistent).

## 5. Contract: `getPoolMemberPredictions`

### 5.1 Function Signature

```ts
/** Fetches predictions for all pool members for matches that have started.
 *  Returns null if caller is not a pool member (defense-in-depth).
 *  File: src/features/pools/queries.ts */
export async function getPoolMemberPredictions(
  poolId: string
): Promise<PoolMemberPrediction[] | null>
```

### 5.2 Implementation Contract

```ts
export async function getPoolMemberPredictions(poolId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  // Verify membership
  const membership = await prisma.poolMembership.findUnique({
    where: { poolId_userId: { poolId, userId } },
  });
  if (!membership) return null;

  // Get member userIds
  const memberships = await prisma.poolMembership.findMany({
    where: { poolId },
    include: { user: true },
  });
  const memberIds = memberships.map(m => m.userId);

  const now = new Date();

  // Fetch predictions for pool members where match has started
  const rows = await prisma.prediction.findMany({
    where: {
      userId: { in: memberIds },
      match: { kickoffAt: { lte: now } },
    },
    include: {
      match: {
        include: {
          homeTeam: true,
          awayTeam: true,
          phase: true,
        },
      },
      user: { select: { nicknameBase, nicknameDiscriminator, avatarUrl } },
      score: { select: { totalPoints, matchedCase } },
    },
    orderBy: { match: { kickoffAt: "asc" } },
  });

  // Transform to PoolMemberPrediction[]
  return rows.map(row => ({
    matchId: row.matchId,
    matchNumber: row.match.matchNumber,
    kickoffAt: row.match.kickoffAt?.toISOString() ?? null,
    matchStatus: row.match.status,
    homeTeam: toTeamView(row.match.homeTeam),
    awayTeam: toTeamView(row.match.awayTeam),
    homePlaceholder: row.match.homePlaceholder,
    awayPlaceholder: row.match.awayPlaceholder,
    homeScore: row.match.homeScore,
    awayScore: row.match.awayScore,
    phaseName: row.match.phase.groupCode
      ? `Grupo ${row.match.phase.groupCode}`
      : row.match.phase.name,
    phaseType: row.match.phase.type,
    userId: row.userId,
    nickname: formatNickname(row.user.nicknameBase, row.user.nicknameDiscriminator),
    avatarUrl: row.user.avatarUrl,
    predictedHome: row.homeScore,
    predictedAway: row.awayScore,
    totalPoints: row.score?.totalPoints ?? null,
    matchedCase: row.score?.matchedCase ?? null,
  }));
}
```

**Note**: Reuses `toTeamView` from `features/competition/queries.ts` and `formatNickname` from `features/pools/services/session.ts`. The `orderBy` ensures predictions come sorted by match kickoff chronologically.

## 6. i18n Keys (ES + EN)

### New keys under `pools.predictions.*`

| Key | ES | EN |
|-----|----|----|
| `pools.predictions.tab` | "Predicciones" | "Predictions" |
| `pools.predictions.dayLabel` | `{date}` (e.g., "Jueves, 11 de junio") | `{date}` (e.g., "Thursday, June 11") |
| `pools.predictions.memberHeader` | "Miembro" | "Member" |
| `pools.predictions.noPrediction` | "—" | "—" |
| `pools.predictions.pendingScore` | "—" | "—" |
| `pools.predictions.emptyTitle` | "Aún no hay predicciones disponibles" | "No predictions available yet" |
| `pools.predictions.emptyDescription` | "Las predicciones serán visibles cuando comiencen los partidos." | "Predictions will be visible once matches begin." |

**Note**: `pools.predictions.dayLabel` uses the same `Intl.DateTimeFormat` pattern and timezone contract as `fixture-by-day.ts`, adapted to the current locale (`es` or `en`). The locale for day formatting comes from `getRequestLocale()`; the timezone must match `/matches` so a user's local 18 June is not grouped under 17 June.

## 7. Out of Scope

- Per-penalty-winner display in prediction cells (future enhancement)
- Expandable match detail with per-member breakdown (future enhancement)
- Notification when a pool peer's prediction becomes visible (future enhancement)
- Timestamp display (explicitly excluded per FR-REFINE-41.4)
- URL-based tab persistence (future enhancement; client-only state for now)

## 8. Security Baseline Compliance

| Rule | Assessment |
|------|-----------|
| SECURITY-08 (Admin gates) | N/A — no admin actions |
| SECURITY-12 (Auth session) | Compliant — membership gate via `getCurrentUserId()` |
| SECURITY-13 (Error messages) | Compliant — no new error messages that leak data |
| Others | N/A — read-only additive feature, no new auth or sensitive data |

## 9. Verification Plan

| Check | Command / Method |
|-------|-----------------|
| TypeScript | `pnpm exec tsc --noEmit` |
| Biome | `pnpm exec biome check` on touched `src/` files |
| ESLint | `pnpm exec eslint` on touched `src/` files |
| Vitest | New tests: query logic (membership gate, visibility window, null predictions), component rendering (days, members, cells, empty state), page integration (tabs presence) |
| Build | `pnpm build` |
