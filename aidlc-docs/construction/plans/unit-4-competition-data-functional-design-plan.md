# Unit 4: Competition Data and API Sync — Functional Design Plan

## Unit
**Competition Data and API Sync** — proveer competición, fases, equipos, partidos, estados/resultados y base de sincronización con API-Football para que Unit 5 pueda bloquear predicciones por kickoff y Unit 6 pueda puntuar.

## Stories
- **US-2.1** Visualización del fixture: calendario por fase/grupo, fecha/hora local, filtros.
- **US-2.2** Estado del partido: scheduled/live/finished y marcador en vivo/final.
- **US-2.3** Desbloqueo de llaves: partidos knockout sin equipos definidos no aceptan predicción hasta estar resueltos oficialmente.
- **US-6.1** Sincronización API-Football: foundation de sync/logs/estado; visibilidad admin completa queda para Unit 7.

## Carry-Forward Inputs
- **CF-2** Banderas SVG locales: no hotlink runtime; almacenar clave ISO alpha-2 / variante de subdivisión.
- **CF-3** Seed de selecciones Mundial 2026 + código de 3 caracteres: confirmar FIFA trigramme vs ISO alpha-3.
- **CF-4** `Competition` extensible: v1 Mundial 2026 funcional, esquema preparado para otras competiciones/formatos.
- **Unit 3 dependency**: reemplazar/soportar `getCompetitionLockTime()` con kickoff del primer partido oficial.

## Plan Checklist
- [x] Collect and analyze answers to clarification questions below.
- [x] Resolve ambiguous answers with follow-up questions if needed. *(No follow-up required; all answers consistent.)*
- [x] Generate `domain-entities.md`.
- [x] Generate `business-logic-model.md`.
- [x] Generate `business-rules.md`.
- [x] Generate `frontend-components.md`.

---

## Clarification Questions

Responde cada pregunta poniendo la letra después de `[Answer]:`. Si ninguna encaja, elige `X` y describe. Las opciones recomendadas están marcadas.

---

### Question 1 — Alcance del fixture inicial (US-2.1)
¿Qué debe existir en v1 para que el fixture sea usable antes de que API-Football esté estable?

A) **Seed demo/real editable + sync lo reconcilia** — se cargan competición, equipos, grupos/fases y partidos conocidos; la API actualiza IDs externos, horarios, estados y resultados. (recomendado)
B) Todo depende de API-Football desde el primer uso; sin seed local salvo tests.
C) Solo seed estático/manual en v1; API-Football queda totalmente para Unit 7.
X) Otro

[Answer]: A

---

### Question 2 — Código de 3 caracteres para selecciones (CF-3)
Para mostrar equipos, ¿qué código de 3 letras usamos?

A) **Código FIFA/trigrama futbolístico** (ARG, BRA, GER, NED, POR), más reconocible para usuarios. (recomendado)
B) ISO 3166-1 alpha-3 estricto (ARG, BRA, DEU, NLD, PRT).
C) Guardar ambos y mostrar FIFA por defecto.
X) Otro

[Answer]: A

---

### Question 3 — Banderas SVG locales (CF-2)
¿Cómo gestionamos los assets de banderas?

A) **Copiar solo las banderas necesarias al repo en `public/flags/`** mediante script reproducible/documentado; se sirven localmente. (recomendado)
B) Instalar un paquete de flags y resolver assets desde `node_modules` en build.
C) Usar URLs remotas de GitHub/CDN en runtime.
X) Otro

[Answer]: A

---

### Question 4 — Modelo multi-competición (CF-4)
¿Cuánta extensibilidad dejamos ahora?

A) **Modelo extensible, UI v1 solo Mundial 2026** — `Competition`, `CompetitionPhase`, `Team`, `Match`; fases tipadas (`GROUP`, `KNOCKOUT`, `LEAGUE`) aunque solo se use Mundial. (recomendado)
B) Modelo solo Mundial 2026 con campos fijos de grupo/ronda; refactor futuro si hace falta.
C) Multi-competición completo en v1, incluyendo UI/admin para crear torneos.
X) Otro

[Answer]: A

---

### Question 5 — Estados de partido (US-2.2)
¿Qué granularidad de estados necesitamos en el dominio?

A) **Simple y suficiente para predicciones/scoring**: `SCHEDULED`, `LOCKED`, `LIVE`, `FINISHED`, `POSTPONED`, `CANCELLED`. (recomendado)
B) Mantener estados crudos del proveedor solamente y mapear en UI.
C) Estados ultra granulares (1H, HT, 2H, ET, PEN, etc.) en el enum principal.
X) Otro

[Answer]: A

---

### Question 6 — Knockout sin equipos definidos (US-2.3)
¿Cómo representamos partidos como “1ro Grupo A vs 2do Grupo B” antes de conocer equipos?

A) **Slots de participante** — `homeTeamId/awayTeamId` nullable + `homePlaceholder/awayPlaceholder`; no se puede predecir hasta tener ambos equipos y kickoff. (recomendado)
B) Crear equipos placeholder (“1A”, “2B”) y reemplazarlos después.
C) No crear partidos knockout hasta que la API los confirme.
X) Otro

[Answer]: A

---

### Question 7 — Fuente de kickoff para congelamiento de pools (Unit 3 dependency)
Unit 3 usa `WORLD_CUP_KICKOFF` temporalmente. ¿Cómo debe quedar en Unit 4?

A) **`Competition.startsAt` / primer match scheduled** — Unit 4 expone servicio que retorna el kickoff del primer partido de la competición activa; env queda fallback. (recomendado)
B) Mantener solo env `WORLD_CUP_KICKOFF` para v1.
C) Config editable por admin en DB, sin derivarlo de matches.
X) Otro

[Answer]: A

---

### Question 8 — Sync API-Football en v1 (US-6.1 foundation)
¿Qué alcance debe tener la sincronización en Unit 4?

A) **Adapter + logs + job manual/programable** — servicios para sync de fixtures/results/status, tabla de logs, pero dashboard admin completo en Unit 7. (recomendado)
B) Solo adapter sin persistir logs; logs por consola.
C) Dashboard admin completo ahora.
X) Otro

[Answer]: A

---

### Question 9 — Frecuencia/ventana de sync
¿Qué estrategia funcional asumimos para los crons?

A) **Dos cadencias**: lenta para fixture futuro (diaria) y rápida en días de partido/live (cada 1–5 min), con idempotencia/rate-limit. (recomendado)
B) Una sola sync diaria para todo.
C) Solo sync manual por admin.
X) Otro

[Answer]: A

---

### Question 10 — Correcciones manuales antes de Unit 7
Si API-Football falla antes de construir el panel admin, ¿qué debe permitir Unit 4?

A) **No UI admin aún; dejar modelo preparado para override** (`manualOverride`/audit fields) pero implementación de override en Unit 7. (recomendado)
B) Crear ya Server Action interna para override manual sin UI.
C) No contemplar overrides hasta Unit 7.
X) Otro

[Answer]: A

---

## Expected Functional Design Outputs
- `domain-entities.md`: `Competition`, `CompetitionPhase`, `Team`, `Match`, `MatchResult`, `ProviderSyncLog`, flag asset model/fields.
- `business-logic-model.md`: fixture listing, status mapping, provider sync, idempotent upsert, knockout unlock, first-kickoff lookup.
- `business-rules.md`: BR-4.x for match states, team identity, provider IDs, locks, sync logs, flag assets, extensibility.
- `frontend-components.md`: fixture screen, phase/group filters, match status badges, unavailable knockout placeholders, sync status surfaces deferred to Unit 7.
