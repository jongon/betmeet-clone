# Unit 4: Competition Data and API Sync — Frontend Components

## UX Scope

Unit 4 exposes user-facing fixture browsing and match state visibility. Admin sync dashboard and manual override UI are deferred to Unit 7.

---

## Screens / Routes

### Fixture Page

Suggested route: `/matches` or `/fixture` (final route decided in Code Generation).

Purpose:
- Show World Cup 2026 fixture grouped by phase/group.
- Let users identify upcoming, live, finished, postponed, and unavailable knockout matches.

Primary components:
- `FixturePage`
- `FixtureFilters`
- `PhaseSection`
- `MatchCard`
- `TeamBadge`
- `MatchStatusBadge`
- `EmptyFixtureState`
- `FixtureErrorState`

States:
- Loading/skeleton if data is deferred.
- Empty if no active competition/fixture seed exists.
- Error with retry/back link if query fails.
- Ready grouped fixture.

---

## Component Contracts

### FixtureFilters

Inputs:
- `phases`: available phase/group options.
- `selectedPhaseType`, `selectedGroupCode`, `selectedStatus`.

Behavior:
- Filter by group/phase/status.
- Preserve query params for shareable fixture views.
- Mobile layout stacks controls vertically.

### PhaseSection

Inputs:
- `phaseName`, `phaseType`, `groupCode?`, `matches[]`.

Behavior:
- Renders a heading and ordered match list.
- Group phases show `Grupo A`, `Grupo B`, etc.
- Knockout phases show route/order, e.g. `Octavos de final`.

### MatchCard

Inputs:
- `matchId`, `kickoffAt`, `status`, `homeTeam?`, `awayTeam?`, `homePlaceholder?`, `awayPlaceholder?`, scores.

Behavior:
- Shows date/time localized for the user.
- Shows team names, FIFA codes, and local flag assets.
- Shows placeholders for unresolved knockout slots.
- Shows score when status is `LIVE` or `FINISHED`.
- Shows clear lock/unavailable copy when teams or kickoff are missing.

### TeamBadge

Inputs:
- `name`, `fifaCode`, `flagPath?`.

Behavior:
- Uses local flag asset when present.
- Falls back to FIFA code if flag asset is missing.
- Must not hotlink external flags.

### MatchStatusBadge

Inputs:
- `status`.

Display mapping:
- `SCHEDULED`: “Programado”
- `LOCKED`: “Bloqueado”
- `LIVE`: “En juego”
- `FINISHED`: “Finalizado”
- `POSTPONED`: “Postergado”
- `CANCELLED`: “Cancelado”

---

## Integration Points

### Unit 5 Predictions

Match cards may later add CTA/links to prediction forms. For Unit 4, they only expose enough state for Unit 5 to decide:
- Teams resolved?
- Kickoff known?
- Status scheduled and before kickoff?

### Unit 6 Scoring

Finished match cards should expose score/result display patterns reusable by prediction/scoring views.

### Unit 7 Admin

No admin sync dashboard in Unit 4. However, future Unit 7 can consume:
- `ProviderSyncLog`
- match raw statuses
- manual override fields

---

## Copy Guidelines

- For unresolved knockout slots: “Equipo por definir: 1ro Grupo A”.
- For scheduled matches: “Predicciones disponibles hasta el kickoff” only after Unit 5 adds prediction CTA.
- For locked/live matches: “Partido bloqueado”.
- For provider errors: “No pudimos actualizar el fixture. Inténtalo más tarde.” Avoid provider details.

---

## Accessibility / Mobile

- Team names and flags must have text labels; flags are decorative if team name/code is visible.
- Match status must be text, not color-only.
- Cards stack as: kickoff/status → home team → score/versus → away team on mobile.
- Filters must use labels and be operable by keyboard.
