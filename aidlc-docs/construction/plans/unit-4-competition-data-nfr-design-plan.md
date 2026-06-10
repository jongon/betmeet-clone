# Unit 4: Competition Data and API Sync — NFR Design Plan

## Unit
**Competition Data and API Sync** — diseño NFR de provider adapter, sync scheduler, cache, staleness, observabilidad, secretos, flags y performance del fixture.

## Plan Checklist
- [x] Collect and analyze answers to clarification questions below.
- [x] Resolve ambiguous answers with follow-up questions if needed. *(Q2 clarified as A after explanation.)*
- [x] Generate `aidlc-docs/construction/unit-4-competition-data/nfr-design/nfr-design-patterns.md`.
- [x] Generate `aidlc-docs/construction/unit-4-competition-data/nfr-design/logical-components.md`.

---

## Contexto

Esta etapa traduce los NFR de Unit 4 en patrones de diseño y componentes lógicos concretos. Decisiones ya aprobadas: MVP pequeño (~200 usuarios, ~2,000 vistas/día pico), live freshness 1–5 min, último dato bueno + stale marker, API key server-side only, no raw payload persistence, cache corto/revalidable, `/matches` mayormente Server Components, logs 90 días, alertas mínimas, Supabase Edge Functions + cron como baseline.

Cada pregunta marca una opción recomendada según el contexto.

---

## Clarification Questions

Responde cada pregunta poniendo la letra después de `[Answer]:`. Si ninguna opción encaja, elige `X` y describe.

---

### Question 1 — Patrón de cache del fixture
¿Cómo materializamos el cache de `/matches`?

A) **Cache por estado/ventana** — `SCHEDULED` futuro con `revalidate` corto (ej. 5–15 min), live/match-day `no-store` o 30–60s, finalizados con revalidate más largo. (recomendado)
B) No cache en Unit 4; DB directa en cada request.
C) Cache único fijo para todo el fixture (ej. 5 min siempre).
X) Otro

[Answer]: A

---

### Question 2 — Stale marker y last sync visible
¿Dónde calculamos y exponemos el estado “stale”?

A) **Servicio server `fixtureFreshness`** — compara último `ProviderSyncLog.SUCCESS` por scope contra ventana esperada y devuelve `isStale`, `lastSyncedAt`, `reason` a la UI. (recomendado)
B) La UI calcula stale leyendo logs directamente.
C) Solo admin ve stale; usuarios no.
X) Otro

[Answer]: A — servicio server `fixtureFreshness`. Aclarado después de ejemplo/recomendación.

---

### Question 3 — Lock anti-concurrencia de sync
¿Cómo evitamos que dos crons/manual sync pisen el mismo scope a la vez?

A) **Lock lógico en DB** — tabla/campo de sync run con `scope+window` único y estado `STARTED`; nuevo run se omite si hay uno activo no expirado. (recomendado)
B) Confiar en que Supabase Cron no dispara en paralelo.
C) Lock en memoria dentro de la función.
X) Otro

[Answer]: A

---

### Question 4 — Reintentos y backoff provider
¿Qué patrón de retry usamos para API-Football?

A) **Retry acotado + exponential backoff + respeto de rate limit** — pocos intentos por run; si rate-limit, registrar `RATE_LIMITED` y no insistir agresivamente. (recomendado)
B) Reintentar hasta que funcione.
C) Sin retries; un fallo termina el run.
X) Otro

[Answer]: A

---

### Question 5 — Separación de normalización/upsert
¿Cómo organizamos provider payload → dominio?

A) **Pipeline fetch → normalize → validate → upsert** — adapter solo normaliza DTOs; servicio de dominio valida/idempotent upsert. (recomendado)
B) Adapter API-Football escribe directamente a Prisma/DB.
C) Guardar payload y procesar después en otro job.
X) Otro

[Answer]: A

---

### Question 6 — Alertas en MVP pequeño
¿Cómo materializamos las alertas mínimas?

A) **Señales en DB + logs estructurados** — `ProviderSyncLog` suficiente para Unit 7 dashboard; por ahora `console.error` estructurado para fallos críticos. (recomendado)
B) Integrar servicio externo de alertas desde ya.
C) Solo `ProviderSyncLog`, sin logs de aplicación.
X) Otro

[Answer]: A

---

### Question 7 — Revalidación post-sync
Tras una sync exitosa, ¿cómo se invalida/cachea el fixture?

A) **Tags/rutas revalidables** — diseñar con `revalidateTag('fixture:{competition}')`/`revalidatePath('/matches')` cuando el sync corre dentro de entorno Next; si Edge externa no puede, usar TTL corto como fallback. (recomendado)
B) Solo TTL, sin invalidación explícita.
C) Siempre no-store para evitar invalidación.
X) Otro

[Answer]: A

---

### Question 8 — Flags assets y validación
¿Cómo garantizamos que no falten flags necesarias?

A) **Script/check de assets** — seed declara `flagKey`; un script valida que exista `public/flags/{flagKey}.svg`; fallback UI sigue existiendo. (recomendado)
B) Confiar en revisión manual.
C) Descargar flags dinámicamente al render si faltan.
X) Otro

[Answer]: A

---

### Question 9 — Protección de endpoints/manual sync
Si Unit 4 deja un trigger manual/dev para sync, ¿cómo se protege?

A) **Server-only + admin/system secret** — en producción solo admin verificado o secreto de cron; nunca público; rate limited por scope. (recomendado)
B) Endpoint público oculto por URL difícil.
C) No dejar ningún trigger manual/dev.
X) Otro

[Answer]: A

---

### Question 10 — Testabilidad del sync
¿Qué patrón de diseño facilita tests sin llamar API-Football?

A) **Provider interface inyectable + fixtures JSON de prueba** — unit tests para mapping/status/upsert con adapter mockeado. (recomendado)
B) Tests contra API-Football real en CI.
C) Sin tests de sync hasta integración manual.
X) Otro

[Answer]: A

---

## Expected NFR Design Outputs
- `nfr-design-patterns.md`: cache por estado, stale marker, sync lock, retry/backoff, normalization pipeline, alerting/logging, cache revalidation, flag asset validation, protected sync trigger, testable provider interface.
- `logical-components.md`: Provider Adapter, Sync Orchestrator, Sync Lock, Fixture Freshness Service, Fixture Query Cache, Flag Asset Registry, Sync Logger, Admin/System Sync Guard, Test Fixtures.
