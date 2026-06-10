# Unit 2: UX Education and Onboarding — Functional Design Plan

## Unit
**UX Education and Onboarding**

**Goal**: Make the rules and first-run experience understandable.

## Scope (from unit-of-work-story-map.md)
- Landing / Public Home screen contract
- Onboarding screen contract (extends Unit 1's nickname → avatar → passkey flow)
- Rules Center screen contract (`/rules`, public summary + full authenticated)
- Match Prediction education cues (scoring hints — component contracts only; the prediction screen itself is Unit 5)
- Score breakdown education from Leaderboard screen contract (explainer component; leaderboard itself is Unit 6)

## Dependency Note
Unit 2 is scheduled before Units 3 (Pools), 5 (Predictions), and 6 (Scoring/Leaderboard),
but its screen contracts reference content from those units (pool previews on landing,
"join/create pool" onboarding step, first-prediction step, score breakdown). The
clarification questions below resolve how to handle these forward dependencies.

## Plan Checklist
- [x] Collect and analyze answers to clarification questions below
- [x] Generate `aidlc-docs/construction/unit-2-ux-education/functional-design/domain-entities.md`
- [x] Generate `aidlc-docs/construction/unit-2-ux-education/functional-design/business-logic-model.md`
- [x] Generate `aidlc-docs/construction/unit-2-ux-education/functional-design/business-rules.md`
- [x] Generate `aidlc-docs/construction/unit-2-ux-education/functional-design/frontend-components.md`

## Resolved Decisions Summary
| Q | Decision |
|---|---|
| 1 | Landing con `PoolPreview` cableado a interfaz de datos, estado skeleton/vacío hasta Unit 3 |
| 2 | Onboarding suma solo el paso `rules` (nickname → avatar → rules → passkey) |
| 3 | Contenido de reglas en archivos MDX/Markdown del repo, renderizados en build |
| 4 | Teaser de puntuación en landing pública + Rules Center completo solo tras login (sin `/rules` público) |
| 5 | Enseñanza de scoring vía calculadora interactiva |
| 6 | Cues mixtos: callouts descartables (first-run) + iconos info persistentes |
| 7 | Estado de descarte de cues en localStorage |
| 8 | Paso `rules` del onboarding es saltable ("Saltar por ahora") |
| 9 | `ScoreBreakdownExplainer` reutilizable + demo en Rules Center con datos de ejemplo |
| 10 | Español ahora, estructurado para i18n (diccionario de copy) |
| 11 | Sin SEO en este unit (landing funcional) |

---

## Clarification Questions

Please answer each question by filling in the letter after the `[Answer]:` tag.
If none of the options match, choose the last option (X) and describe your preference.

---

### Question 1
The Landing / Public Home contract includes a "public pool preview" section, but pools are built in Unit 3. How should the landing page handle this in Unit 2?

A) Build the landing now with a static placeholder section ("Pools públicos — próximamente") that Unit 3 replaces with real data
B) Build the landing with the pool preview component fully wired to a data interface, rendering an empty/skeleton state until Unit 3 provides data
C) Omit the pool preview section entirely from the landing in Unit 2; Unit 3 adds it later
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 2
The full onboarding per the screen contract is: nickname → avatar → rules → pool action → first prediction. Unit 1 already shipped nickname → avatar → passkey. How should Unit 2 extend the flow given pools (Unit 3) and predictions (Unit 5) don't exist yet?

A) Add only the "rules" step now (nickname → avatar → rules → passkey); pool and prediction steps are added by Units 3/5 inside their own work
B) Add all remaining steps now, with pool/prediction steps showing a "próximamente" placeholder that becomes functional in Units 3/5
C) Add the rules step plus a final "next steps" screen that links to wherever the user should go next (links activate as units ship)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 3
Where should the Rules Center content (scoring rules, examples, pool rules, lock rules) live?

A) Hardcoded in React components / constants in the repo — content changes require a deploy
B) MDX/Markdown files in the repo rendered at build time — content editable without touching components, still requires deploy
C) Database-driven (rules content table editable from the future admin panel) — no deploy needed for copy changes
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 4
What's the difference between the public rules summary and the full authenticated Rules Center?

A) Same page `/rules` for everyone; authenticated users just see a different CTA ("Hacer predicciones" vs "Crear cuenta para jugar") — all rule content is public
B) Public sees only the scoring summary card; full sections (penalties, locks, ties, pool rules with examples) require sign-in
C) Two routes: a public `/rules` summary and an authenticated in-app Rules Center with interactive examples
X) Other (please describe after [Answer]: tag below)

[Answer]: Las reglas se ven al entrar al espacio privado
[Resolved follow-up]: La landing pública (`/`) conserva solo el mini-teaser de puntuación como parte de su propuesta de valor. NO existe `/rules` público. El Rules Center completo (puntuación, penales, bloqueos, empates, reglas de pool) vive en `/rules` pero requiere sesión iniciada; se elimina `/rules` de las rutas públicas del `proxy.ts` durante code generation.

---

### Question 5
How should scoring be taught in the Rules Center?

A) Static worked examples — fixed example cards (e.g., "Predijiste 2-1, quedó 2-1 → 5 puntos") covering all 5 scoring cases
B) Interactive calculator — user enters a hypothetical prediction + result and sees the points computed live
C) Both: static example cards plus an interactive "prueba el puntaje" widget
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 6
What form should the contextual education cues take (scoring hint on prediction form, lock countdown explanation, discriminator explanation, etc.)?

A) Info icons with popover/tooltip — always available, never intrusive, no dismissal state needed
B) Dismissible inline callouts — visible by default the first times, user can dismiss permanently
C) Mixed: dismissible callouts for first-run education + persistent info icons for reference
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Question 7
If cues are dismissible (Q6 B or C), where is the dismissal state stored?

A) localStorage only — resets if the user changes browser/device; no backend work
B) Profile in DB — consistent across devices; adds a `dismissed_cues` field/table
C) Not applicable — I chose option A in Question 6
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 8
Should completing the new "rules" onboarding step be required (hard gate, like nickname) or skippable?

A) Required — user must at least page through the rules summary once before finishing onboarding
B) Skippable — show it but allow "Saltar por ahora"; rules remain accessible from the Rules Center
C) Acknowledgment checkbox — user must tick "Entiendo cómo se puntúa" to continue (one screen, fast)
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 9
The score breakdown education ("Ver mi desglose" in the Leaderboard) belongs to a screen built in Unit 6. What does Unit 2 deliver for it?

A) Nothing yet — Unit 6 builds the breakdown with educational copy at that time; Unit 2 only documents the content/copy spec
B) A reusable, data-agnostic `ScoreBreakdownExplainer` component (given a prediction + result + points, renders the explanation) that Unit 6 plugs in
C) The component plus a demo of it inside the Rules Center using example data (doubles as the scoring examples from Q5)
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Question 10
What language(s) should all the educational content be written in?

A) Spanish only — hardcoded Spanish copy (consistent with current CTAs like "Crear mi quiniela")
B) Spanish now but structured for i18n — copy lives in a translations/dictionary file from day one
C) Spanish + English from launch
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 11
Does the landing page need SEO/marketing considerations in scope for this unit?

A) Basic — static metadata, semantic HTML, Open Graph tags; no extra work
B) Full — basic plus structured data (JSON-LD), sitemap entry, and optimized Core Web Vitals as acceptance criteria
C) None — the landing is functional only; SEO comes later
X) Other (please describe after [Answer]: tag below)

[Answer]: C
