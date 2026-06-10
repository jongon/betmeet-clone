# Unit 4: Competition Data and API Sync — Infrastructure Design Plan

## Unit
**Competition Data and API Sync** — infraestructura para tablas de competición/fixture, sync API-Football, scheduled jobs, assets SVG locales, secretos y logs operativos.

## Plan Checklist
- [x] Collect and analyze answers to clarification questions below.
- [x] Resolve ambiguous answers with follow-up questions if needed. *(No follow-up required; Q7 note folded into seed/UI requirements.)*
- [x] Generate `aidlc-docs/construction/unit-4-competition-data/infrastructure-design/infrastructure-design.md`.
- [x] Generate `aidlc-docs/construction/unit-4-competition-data/infrastructure-design/deployment-architecture.md`.
- [x] Update `aidlc-docs/construction/shared-infrastructure.md` if new shared env/resources are confirmed.

---

## Contexto y cobertura de categorías

Unit 4 sí introduce infraestructura nueva sobre la base Vercel + Supabase:

| Categoría | Necesidad Unit 4 |
|---|---|
| Deployment Environment | Local/Preview/Production con seed fixture y API key por entorno |
| Compute | Next.js server reads + Supabase Edge Function/cron para sync |
| Storage | Nuevas tablas Postgres: competitions, phases, teams, matches, sync logs/locks |
| Messaging / Async | Scheduled sync jobs; sin cola dedicada en MVP |
| Networking | Salida server-side a API-Football; secrets no públicos |
| Monitoring | ProviderSyncLog + logs estructurados; alertas mínimas |
| Assets | SVG flags locales en `public/flags/` |
| Shared Infrastructure | Nueva env `API_FOOTBALL_KEY`; posible cron secret/system secret |

---

## Clarification Questions

Responde cada pregunta poniendo la letra después de `[Answer]:`. Si ninguna opción encaja, elige `X` y describe.

---

### Question 1 — Ubicación real del scheduled sync
NFR asumió Supabase Edge Functions + cron como baseline. ¿Lo confirmamos para Infrastructure Design?

A) **Supabase Edge Function scheduled** — sync corre en Supabase, cerca de DB; Next solo lee datos. (recomendado)
B) Vercel Cron llamando Route Handler de Next.js.
C) Híbrido: Vercel Cron llama una Edge Function Supabase.
X) Otro

[Answer]: A

---

### Question 2 — Trigger manual/dev de sync
¿Dejamos un mecanismo manual para ejecutar sync en local/preview?

A) **Sí, script/server action protegida para dev/admin** — útil para bootstrap y debugging; producción protegido por admin/secret. (recomendado)
B) Solo cron automático, sin trigger manual.
C) Solo scripts locales; nada desplegado.
X) Otro

[Answer]: A

---

### Question 3 — Gestión de secretos en Supabase/Vercel
¿Dónde configuramos `API_FOOTBALL_KEY`?

A) **Secret por entorno en Supabase para Edge Function + env local documentado**; si Next necesita disparar sync manual, usa un secreto separado. (recomendado)
B) Solo Vercel env vars; Edge Function no llama provider directamente.
C) Supabase Vault desde ya.
X) Otro

[Answer]: A

---

### Question 4 — Modelo de locks de sync
¿Creamos una tabla separada de lock/run o reutilizamos `ProviderSyncLog`?

A) **Tabla/log unificada `provider_sync_runs`** con status, timestamps y unique scope/window; sirve como lock y log. (recomendado)
B) Dos tablas: `provider_sync_locks` y `provider_sync_logs` separadas.
C) Solo logs, sin constraint/lock explícito.
X) Otro

[Answer]: A

---

### Question 5 — RLS para fixture público/autenticado
¿Quién puede leer fixture/teams/matches directamente vía Supabase client?

A) **Lectura autenticada para fixture, writes bloqueados** — todos los usuarios logueados pueden leer competitions/phases/teams/matches; writes solo server/service role. (recomendado)
B) Fixture público legible incluso sin sesión.
C) No permitir lecturas directas; solo Server Components vía Prisma.
X) Otro

[Answer]: A

---

### Question 6 — Flags SVG: origen y almacenamiento
¿Cómo bajamos/guardamos flags?

A) **Script reproducible que copia desde repo público a `public/flags/`**; commit de SVGs necesarios. (recomendado)
B) Subir flags a Supabase Storage.
C) Descargar durante build sin commitear assets.
X) Otro

[Answer]: A

---

### Question 7 — Seeds de competición por entorno
¿Cómo se carga el seed World Cup 2026?

A) **Script `seed-competition` idempotente** ejecutable local/preview/prod tras migraciones; no automático en cada build. (recomendado)
B) Seed automático en `postinstall`/build.
C) Manual vía SQL editor únicamente.
X) Otro

[Answer]: A, ese seed y esa data inicial del mundial deberias, conseguirla y cargarla. Adicionalmente con respecto a los horarios de los partidos al usuario tiene que salir su hora local.

---

### Question 8 — Retención/limpieza de sync runs
¿Cómo limpiamos logs >90 días?

A) **Job de cleanup simple** incluido en el sync diario o script/admin task; borra/archiva runs antiguos. (recomendado)
B) No implementar cleanup en v1, solo documentar.
C) Trigger/pg_cron DB dedicado para cleanup.
X) Otro

[Answer]:A

---

### Question 9 — Observabilidad y alertas infra
¿Qué materializamos en infraestructura ahora?

A) **Logs estructurados + ProviderSyncRun queryable**; Unit 7 dashboard/alertas usa esa tabla; sin servicio externo por ahora. (recomendado)
B) Integrar servicio externo de alertas ahora.
C) Solo logs de Supabase dashboard, sin tabla consultable.
X) Otro

[Answer]: A

---

### Question 10 — Ambientes Preview y API-Football quota
¿Los previews deben llamar API-Football real?

A) **Preview usa seed/mock por defecto; API real solo si env key está configurada explícitamente** para no gastar cuota. (recomendado)
B) Todos los previews llaman API real.
C) Ningún entorno salvo producción llama API real.
X) Otro

[Answer]: A

---

## Expected Infrastructure Outputs
- `infrastructure-design.md`: mapping de componentes lógicos a Supabase DB/Edge Functions/Vercel/assets/secrets/RLS/monitoring.
- `deployment-architecture.md`: topología local/preview/prod, sync flow, seed flow, cron flow, secrets, cache/revalidation boundaries.
- `shared-infrastructure.md`: nueva env/secrets, seed script y sync/monitoring notes si aplica.
