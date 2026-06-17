# Unit 36 Functional Design Plan — Scoring acumulativo

## Stage Context

- **Unit**: Unit 36 — Scoring acumulativo por ganador y goles acertados
- **Stage**: Functional Design (light)
- **Scope**: Cambiar la matematica de scoring y el desglose educativo/persistido sin reiniciar Units 1-35.
- **Application code location**: Workspace root (`src/`), never `aidlc-docs/`.

## Plan Steps

- [x] Step 1 — Load Unit 36 requirements and unit definition.
- [x] Step 2 — Inspect current scoring engine, score persistence adapter, explainer UI, calculator copy, and tests.
- [x] Step 3 — Decide Functional Design depth and stage applicability.
- [x] Step 4 — Define the accumulative scoring algorithm and matched-case summary semantics.
- [x] Step 5 — Define UI/persistence impact and schema decision.
- [x] Step 6 — Record skipped stages: formal NFR Requirements, NFR Design, and Infrastructure Design.
- [x] Step 7 — Generate `aidlc-docs/construction/unit-36-scoring-accumulative/functional-design.md`.
- [x] Step 8 — Update `aidlc-docs/aidlc-state.md` and `aidlc-docs/audit.md` in the same interaction.

## Clarifications

No new clarification file is required for Functional Design. The requirement includes the canonical example and explicitly states exact score remains 5, non-exact result/goals stack, penalty bonus remains additional, and schema migration is skipped unless proven necessary.
