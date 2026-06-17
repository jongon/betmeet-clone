# Integration Test Instructions — Unit 41

## Purpose
Validate that the new "Predicciones" tab integrates correctly with the existing pool detail page and adjacent features.

## Test Scenarios

### Scenario 1: Pool detail page renders with Tabs
- **Description**: Page loads with three tabs (Clasificación/Predicciones/Miembros), default tab is Clasificación
- **Setup**: Authenticated user who is a member of at least one pool
- **Test Steps**:
  1. Navigate to `/pools/[id]`
  2. Verify three tabs render: Clasificación, Predicciones, Miembros
  3. Verify Clasificación tab is active by default
  4. Verify leaderboard renders
- **Expected Results**: Existing leaderboard + member list + sidebar all intact. Tabs visible.
- **Cleanup**: None needed

### Scenario 2: Predictions tab shows member predictions
- **Description**: Clicking "Predicciones" tab shows by-day table of member predictions for started matches
- **Setup**: Pool with multiple members who have made predictions on started matches
- **Test Steps**:
  1. Click "Predicciones" tab
  2. Verify day groups render chronologically
  3. Verify member avatars + nicknames in left column
  4. Verify prediction cells show `X - Y` format
  5. Verify points badges on scored matches
  6. Verify "—" for pending scores on LIVE matches
- **Expected Results**: Table renders with correct data per functional design BR-41.5
- **Cleanup**: None needed

### Scenario 3: Non-member cannot access predictions
- **Description**: User who is not a pool member gets `notFound()`
- **Setup**: Authenticated user not in the pool
- **Test Steps**:
  1. Navigate to `/pools/[id]` where user is not a member
  2. Verify page returns 404
- **Expected Results**: 404, no data leaked
- **Cleanup**: None needed

### Scenario 4: Empty state when no matches started
- **Description**: Pool created before tournament begins
- **Setup**: Pool with members but no matches with `kickoffAt <= now`
- **Test Steps**:
  1. Click "Predicciones" tab
  2. Verify empty state message
- **Expected Results**: `emptyTitle` + `emptyDescription` rendered
- **Cleanup**: None needed

## Integration Points Verified
| From | To | Status |
|------|----|--------|
| `page.tsx` → `getPoolMemberPredictions()` | `pools/queries.ts` | ✅ Promise.all with existing queries |
| `PoolPredictionsView` → `getRequestLocale()` | `i18n/get-dictionary` | ✅ Locale-aware day formatting |
| `MemberList` → `PoolDetail.members` | `pools/types.ts` | ✅ Untouched, existing functionality |
| `PoolLeaderboard` → `getPoolLeaderboard()` | `scoring-rankings/queries.ts` | ✅ Untouched, existing functionality |
| Sidebar (InviteShare, DirectedInviteForm, PoolActions) | `pools/components/` | ✅ Untouched, wraps outside Tabs |
