# Unit Test Execution — Unit 41

## Run All Tests
```bash
pnpm test
```

## Run Unit 41 Focused Tests
```bash
pnpm exec vitest run \
  src/features/pools/__tests__/pool-predictions.test.ts \
  src/features/pools/components/__tests__/pool-predictions-view.test.tsx
```

## Test Cases

### Query Tests (6 tests)
| Test | Description |
|------|-------------|
| `returns null when not authenticated` | `getCurrentUserId()` returns null → query returns null |
| `returns null when caller is not a pool member` | Membership check fails → query returns null |
| `returns empty array when no predictions yet` | `findMany` returns [] → query returns [] |
| `returns predictions only for matches with kickoffAt <= now` | 2 members predict same match → 2 results with nicknames, scores, points |
| `includes predictions where member has no score yet (LIVE match)` | Match is LIVE → score is null, prediction exists |
| `does NOT include predictions for matches with kickoffAt > now` | Future match → excluded by Prisma `where` clause |

### Component Tests (10 tests)
| Test | Description |
|------|-------------|
| `buildMatchLabel` — `uses fifaCode for resolved teams` | FINISHED match → `BRA vs ARG` + sublabel `2 - 1` |
| `buildMatchLabel` — `shows sublabel only for FINISHED with scores` | LIVE match → sublabel null |
| `buildMatchLabel` — `fallback to placeholders when no team` | No teams → `Winner A vs Runner-up B` |
| `buildMatchLabel` — `shows '?' for missing team and placeholder` | One missing → `? vs FRA` |
| `buildDayGroups` — `groups matches by UTC day` | Different days → 2 groups |
| `buildDayGroups` — `keeps matches on same day in one group` | Same day → 1 group, 2 matches |
| `buildDayGroups` — `sorts matches chronologically within a day` | Later input first → sorted ascending |
| `buildDayGroups` — `deduplicates predictions for same match across users` | 2 users predict same match → 1 match column |
| `buildDayGroups` — `handles matches with null kickoffAt` | null kickoff → `__tbd__` bucket |
| `buildDayGroups` — `returns empty array when no predictions` | Empty input → empty output |

## Expected Results
- **16 tests pass**, 0 failures
- **Suite total**: 281 tests pass (265 existing + 16 new)
