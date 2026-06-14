# Screen Contracts

## Screen Contract: Landing / Public Home

### Surface
- Route: `/`

### User Goal
- Understand what a quiniela is and why joining pools is fun before signing up.

### Entry Context
- User arrives from search, referral, pool invite, or social link.

### Primary Action
- Main CTA: `Entra a Jugar`
- Expected result: User starts registration/login flow.

### Secondary Actions
- `Ver reglas rápidas`
- `Explorar pools públicos`
- `Iniciar sesión`

### Minimum Decision Content
- What is a quiniela.
- Scoring summary: exact 5, result 2, partial score 1, penalties +1.
- Public vs private pools.
- World Cup 2026 focus.

### States
- Empty: Not applicable.
- Loading: Skeleton for public pool preview.
- Error: Hide dynamic previews and keep static explanation.
- Success: CTA and rule summary visible.

### Mobile Notes
- First screen must show value proposition, one scoring teaser, and CTA.
- Pool previews and deeper rules can be below the fold.

### UX Risks
- Too much scoring detail before sign-up can overwhelm users.

## Screen Contract: Onboarding

### Surface
- Flow after first verified login.

### User Goal
- Complete identity setup and make the first meaningful app decision.

### Entry Context
- User has authenticated and may have Google photo/name available.

### Primary Action
- Main CTA: `Guardar y continuar`
- Expected result: Move through nickname, avatar, rules, pool, first prediction steps.

### Secondary Actions
- `Saltar por ahora` only where safe.
- `Cambiar avatar`.

### Minimum Decision Content
- Nickname preview with discriminator.
- Avatar options.
- Short rules summary.
- Choice: join pool, create pool, browse public pools.

### States
- Empty: New user starts at step 1.
- Loading: Save progress spinner.
- Error: Inline validation for nickname/avatar.
- Success: Step completed and next step shown.

### Mobile Notes
- One decision per screen.
- Avoid showing all onboarding steps expanded.

### UX Risks
- Nickname discriminator may confuse users if not previewed clearly.

## Screen Contract: Rules Center

### Surface
- Route: `/rules`

### User Goal
- Learn scoring, pool, prediction lock, penalty, and tie rules.

### Entry Context
- Public users see summary; authenticated users see full rules.

### Primary Action
- Main CTA public: `Crear cuenta para jugar`
- Main CTA authenticated: `Hacer predicciones`

### Secondary Actions
- `Ver pools públicos`
- `Copiar reglas del pool` for pool admins later.

### Minimum Decision Content
- Scoring examples.
- Penalty prediction rules.
- Pool member limit and removal rule.
- Match lock deadline.
- Ranking tie behavior.

### States
- Empty: Static rules always available.
- Loading: Not required for core rules.
- Error: Dynamic examples fail gracefully.
- Success: Rules shown by sections.

### Mobile Notes
- Use accordions for detailed sections.
- Keep scoring card sticky or repeated near examples.

### UX Risks
- Users may assume global ranking exists; clarify ranking is pool-only.

## Screen Contract: Match Prediction Screen

### Surface
- Route/component: match card and match detail prediction form.

### User Goal
- Submit or update a prediction before kickoff.

### Entry Context
- User comes from fixture, dashboard, pool detail, or reminder cue.

### Primary Action
- Main CTA: `Guardar predicción`
- Expected result: Prediction saved and visible with lock countdown.

### Secondary Actions
- `Ver reglas de puntuación`
- `Cambiar predicción` before kickoff.

### Minimum Decision Content
- Teams, kickoff time, match phase, lock status.
- Score inputs.
- If knockout and tied prediction: penalty winner selection.
- Scoring hint.

### States
- Empty: No prediction yet; score inputs default to 0-0.
- Loading: Saving state disables CTA.
- Error: Show validation or lock conflict message.
- Success: Saved prediction summary and countdown.

### Mobile Notes
- Team names, score controls, and CTA must fit first viewport.
- Rules explanation collapses behind info button.

### UX Risks
- Penalty selector must only appear for tied knockout predictions or users may misunderstand scoring.

## Screen Contract: Pool Detail

### Surface
- Route: `/pools/[poolId]`

### User Goal
- See pool status, members, leaderboard, and next predictions.

### Entry Context
- User is a member or viewing a public pool.

### Primary Action
- Main CTA member: `Predecir próximos partidos`
- Main CTA visitor: `Unirme al pool`

### Secondary Actions
- `Invitar amigos`
- `Ver reglas`
- `Administrar miembros` for pool admin before first match.

### Minimum Decision Content
- Pool type, capacity, member count.
- User membership state.
- Leaderboard preview.
- Next unlocked matches.

### States
- Empty: New pool has no members beyond creator and no ranking yet.
- Loading: Skeleton leaderboard and match list.
- Error: Show retry for pool data.
- Success: Pool overview and next action shown.

### Mobile Notes
- Put user rank and next prediction CTA above full member list.

### UX Risks
- Admin removal rule must be clear before first match starts.

## Screen Contract: Pool Invite / Join

### Surface
- Route/modal: invite link and public pool join flow.

### User Goal
- Join the correct pool with confidence.

### Entry Context
- User follows invite link or clicks a public pool.

### Primary Action
- Main CTA: `Unirme a este pool`
- Expected result: Membership created if verified and pool has capacity.

### Secondary Actions
- `Iniciar sesión`
- `Ver reglas del pool`
- `Buscar otros pools`

### Minimum Decision Content
- Pool name, creator nickname, public/private, member count, capacity.
- Requirement: verified user only.

### States
- Empty: Invalid invite code shows explanation.
- Loading: Joining state.
- Error: Full pool, unverified user, already joined, invalid code.
- Success: Redirect to pool detail.

### Mobile Notes
- Pool identity and CTA must appear before member previews.

### UX Risks
- Users may think private pools are searchable; explain invite requirement.

## Screen Contract: Leaderboard

### Surface
- Component inside pool detail plus standalone pool leaderboard.

### User Goal
- Understand position and why points changed.

### Entry Context
- User views a pool after matches or from dashboard.

### Primary Action
- Main CTA: `Ver mi desglose`
- Expected result: User sees scoring breakdown by match.

### Secondary Actions
- `Ver predicciones`
- `Predecir próximos partidos`

### Minimum Decision Content
- Rank, avatar, nickname, total points.
- Tie treatment.
- Last updated timestamp.

### States
- Empty: No completed matches; explain ranking starts after first result.
- Loading: Skeleton rows.
- Error: Retry leaderboard calculation/read.
- Success: Ordered leaderboard with tied ranks.

### Mobile Notes
- Show current user pinned/visible.
- Hide secondary breakdown columns behind expansion.

### UX Risks
- Tie ranking can look broken if repeated positions are not labeled clearly.

## Screen Contract: Profile / Avatar / Nickname

### Surface
- Route: `/profile`

### User Goal
- Manage identity shown in pools and rankings.

### Entry Context
- User comes from onboarding, settings, or avatar/nickname prompt.

### Primary Action
- Main CTA: `Guardar perfil`
- Expected result: Profile identity is updated.

### Secondary Actions
- `Cambiar avatar`
- `Elegir avatar predeterminado`
- `Subir foto`
- `Configurar seguridad`

### Minimum Decision Content
- Current nickname with discriminator.
- Avatar source and preview.
- Google photo if available.
- Upload constraints.

### States
- Empty: New profile uses generated defaults.
- Loading: Upload/save progress.
- Error: Nickname invalid, upload rejected, storage failure.
- Success: Updated profile preview.

### Mobile Notes
- Avatar preview and nickname field first.

### UX Risks
- Users may expect changing base nickname to preserve discriminator; explain final displayed name.

## Screen Contract: Admin Sync Dashboard

### Surface
- Route: `/admin/sync`

### User Goal
- Monitor football API sync and safely correct results if needed.

### Entry Context
- Global admin sees sync failures or needs operational review.

### Primary Action
- Main CTA: `Forzar sincronización`
- Expected result: Sync job starts and status updates.

### Secondary Actions
- `Sobrescribir resultado`
- `Ver eventos de auditoría`
- `Recalcular puntos`

### Minimum Decision Content
- Last successful sync.
- Provider status.
- Recent failures.
- Matches needing attention.
- Impact warning for manual overrides.

### States
- Empty: No sync history yet.
- Loading: Sync running state.
- Error: Provider failure, rate limit, DB write failure.
- Success: Sync summary and affected matches.

### Mobile Notes
- Admin operations can prioritize desktop, but critical status must be readable on mobile.

### UX Risks
- Manual overrides can affect rankings; require confirmation and audit reason.
