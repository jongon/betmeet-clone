# Carry-Forward Decisions / Constraints

> Requisitos y restricciones de dominio identificados fuera del unit que los implementa.
> Sirven de **entrada obligatoria** para la etapa correspondiente. No se pierden entre units.

---

## CF-1 — Tema claro/oscuro y detección de sistema
**Origen**: Feedback del usuario (2026-06-10).
**Destino**: Unit 2 (UX Education and Onboarding) — es transversal pero su hogar natural es la unidad de UX, que ya toca `globals.css` y la landing.
**Requisito**: La aplicación debe soportar **light mode / dark mode** y **detección de la preferencia del sistema** (`prefers-color-scheme`), con posibilidad de override manual persistente.
**Notas**:
- Tailwind v4 es CSS-first (tokens en `src/app/globals.css`); el dark mode se define con variantes/`@media (prefers-color-scheme)` o un `data-theme` en `<html>`.
- Al ser tokens globales, estilar el tema cubre retroactivamente las pantallas de Unit 1 (auth/onboarding) — es aditivo, no rompe nada.
- Decisión de override: toggle persistido (cookie para SSR sin flash, o `localStorage` aceptando un posible flash). Se concreta en NFR/Tech-stack de Unit 2.

---

## CF-2 — Banderas de países (assets SVG)
**Origen**: Feedback del usuario (2026-06-10).
**Destino**: Unit 4 (Competition Data and API Sync) + estrategia de assets.
**Requisito**: Los equipos se identifican por la **bandera de su país**; las banderas SVG se obtienen de un repositorio público de GitHub y se incluyen como assets del proyecto (no hotlink en runtime).
**Notas / decisiones**:
- Fuente aplicada (2026-06-11): `lipis/flag-icons` (SVG por código **ISO 3166-1 alpha-2**, en minúscula, más subdivisiones `gb-*`).
- **Mismatch de claves**: las banderas se indexan por ISO alpha-2 (`de`, `nl`, `br`), pero el usuario pide mostrar el **código de 3 letras** (ver CF-3). Hay que almacenar ambos.
- Casos FIFA sin ISO de país: Inglaterra/Escocia/Gales no son países ISO; usan banderas de subdivisión `gb-eng`, `gb-sct`, `gb-wls`. El seed debe contemplarlos.
- Descarga reproducible implementada: `pnpm sync:flags` descarga los SVG necesarios a `public/flags/`; `pnpm check:flags` valida cobertura antes de deploy. No hay dependencia runtime de CDN externo.

---

## CF-3 — Seed de países del Mundial 2026 + código de 3 caracteres
**Origen**: Feedback del usuario (2026-06-10).
**Destino**: Unit 4 (Competition Data and API Sync) — entidades de dominio + seed.
**Requisito**: Seed de las selecciones clasificadas al Mundial 2026, mostradas con un **código de 3 caracteres**.
**Notas / decisiones**:
- **Aclaración de "ISO 3 caracteres"**: Unit 4 usa el **trigrama FIFA** como código visible (GER, NED, POR), no ISO 3166-1 alpha-3, para coincidir con el uso futbolístico.
- Modelo sugerido para `Team`/`Country`: guardar `isoAlpha2` (clave de bandera), `displayCode` (3 chars, FIFA por defecto) y `name`.
- El Mundial 2026 son **48 selecciones**. A 2026-06-10 la clasificación puede no estar 100% cerrada; el seed debe permitir altas/ajustes (y el sync por API-Football reconcilia).

---

## CF-4 — Competition como entidad extensible (multi-competición)
**Origen**: Feedback del usuario (2026-06-10). Parcialmente reconocido en `application-design/components.md` ("Store FIFA World Cup 2026 fixture **and future competitions**") y `services.md`, pero **no modelado** en detalle.
**Destino**: Unit 4 (Competition Data and API Sync) — modelo de datos / functional design.
**Requisito**: El Mundial es **una** competición con una estructura (grupos + knockout). El modelo de datos debe permitir, a futuro, agregar **otras competiciones con estructuras distintas** (ligas con ida/vuelta, copas, formatos mixtos) sin reescribir el dominio.
**Notas / decisiones pendientes**:
- Modelar `Competition` → `Phase/Stage` (tipo: `group` | `knockout` | `league` | ...) → `Match`, en vez de cablear "grupos + octavos" como columnas fijas.
- El `ScoringRuleSet` ya se diseñó como entidad compartida (Unit 2/Unit 6); idealmente el reglamento de puntuación se asocia a la competición/edición para permitir reglas distintas por torneo.
- El `Football API Adapter` ya está pensado para "provider replacement"; la extensibilidad de estructura es el complemento del lado del modelo de dominio.
- Confirmar alcance v1: solo Mundial 2026 funcional, pero **esquema** preparado para multi-competición (sin construir UI de gestión de competiciones en v1).

---

## CF-5 — Glosario de copy en español internacional
**Origen**: Decisión de producto/copy del usuario (2026-06-10).
**Destino**: Transversal — UI, contenido educativo, documentación de producto y futuros copy changes.
**Requisito**: La experiencia debe usar español neutro internacional y evitar regionalismos como **quiniela**. El término de producto para los grupos de competencia es **Liga**.
**Glosario aprobado**:
- **Quiniela / pool** → **Liga** en copy visible.
- **Leaderboard / tabla de posiciones** → **Ranking**.
- **Pick** → **Predicción**; no usar `pick` en mensajes al usuario.
- **Kickoff** → **Inicio del partido**.
- **Invite** → **Invitación**.
**Notas**:
- Los identificadores técnicos existentes (`Pool`, rutas `/pools`, slugs, modelos Prisma y nombres de componentes) se conservan para evitar un refactor funcional innecesario.
- En documentación técnica, `Pool` puede mantenerse como nombre de entidad, pero su descripción visible debe explicar que representa una **liga**.

---

## CF-6 — Estrategia de migraciones de base de datos
**Origen**: Sesión de operaciones (2026-06-11) al inicializar el schema de prod.
**Destino**: Transversal — fase OPERATIONS (`operations/operations-runbook.md`) + tooling de schema.
**Problema**: El proyecto tiene una **inconsistencia** entre dos mecanismos de schema:
- `prisma/schema.prisma` define **todas** las tablas (fuente de verdad del modelo).
- `supabase/migrations/0001–0010` solo hacen `ENABLE RLS` + `CREATE POLICY` + triggers,
  **asumiendo tablas ya creadas por Prisma**. Solo `0011` hace `CREATE TABLE`, duplicando
  modelos de Prisma.
- AGENTS.md dice *"no se usa prisma migrate"*, pero **ningún paso documentado crea las
  tablas base** → en una BD vacía las migraciones SQL fallan (`relation does not exist`).
**Decisión APROBADA e IMPLEMENTADA (2026-06-11)**: consolidar en **migraciones Prisma
versionadas** (`prisma/migrations/` + `prisma migrate deploy`):
- Implementado: `20260609000000_init` (baseline) + `20260611120000_rls_constraints_triggers`
  (RLS/CHECK/índices parciales/triggers/Storage; FK duplicada `predictions_penalty_team_fk`
  omitida porque el baseline ya la crea).
- Validado en BD temporal local con stubs `auth`/`storage`: ambas migraciones aplican,
  **drift = 0** vs `schema.prisma`, seed OK, 16 tablas con RLS.
- `supabase/migrations/*.sql` eliminadas del repo tras portarlas (historial en git).
- **Pendiente**: ejecutar `prisma migrate deploy` contra prod (direct connection).
Detalle del enfoque:
- Baseline generado con `prisma migrate diff --from-empty --to-schema-datamodel` (crea tablas/enums/índices/FKs).
- Migraciones posteriores con el contenido RLS/triggers de `supabase/migrations/0001–0011`
  (de `0011` solo la parte RLS; sus `CREATE TABLE`/`CREATE TYPE` ya quedan en el baseline).
- Como prod está vacío, es el momento ideal para baselinear sin reconciliar datos.
**Notas / fuera de alcance de la conversión**:
- Plantillas de email de auth, bucket de Storage `avatars`, edge functions y `config.toml`
  siguen siendo responsabilidad de Supabase (no migran a Prisma).
- Implica actualizar `AGENTS.md`/`WORKFLOWS.md` (cambio de convención deliberado).
- DDL por **direct connection** (`:5432`), no por el transaction pooler (`:6543`).
- Interino mientras no se apruebe: `prisma db push` crea tablas + aplicar `supabase/migrations` para RLS.

---

## CF-7 — Middleware de auth (`proxy.ts`) y destino post-autenticación
**Origen**: Bug fix en producción (2026-06-11) — confirmación de email daba 404 y el login "no llevaba a ningún lado".
**Destino**: Unit 1 (Foundation, auth gate) + Unit 2 (fin de onboarding). Transversal a las rutas autenticadas.
**Decisión / restricción**:
- En **Next.js 16** el archivo de middleware se llama **`src/proxy.ts`** (el framework reconoce `proxy` y `middleware` como nombres válidos; este proyecto usa `proxy` con `export async function proxy`). Toda la documentación que diga `src/middleware.ts` se refiere a este archivo.
- `src/proxy.ts` es el **gate de auth activo** (refresco de sesión Supabase SSR, redirección de páginas auth-only, gate de onboarding por `nickname_base`, gate `/admin/*` por rol ADMIN). **No es código muerto**: sin él la sesión no se propaga en navegación (los Server Components no pueden reescribir cookies) y nadie enruta al usuario.
- La **home autenticada** del producto es **`/matches`** (fixture). Tras login (`sign-in`), tras completar/saltar onboarding, tras confirmar email (callback) y al redirigir a un usuario autenticado fuera de una página auth-only, el destino es `/matches` — **no** la landing pública `/` (que no tiene entrada a la app para usuarios logueados).
**Contexto / hallazgo de metodología**:
- El commit `683d707` ("clean codebase") **eliminó `src/proxy.ts`** etiquetándolo como *"dead code: unwired auth middleware"* **sin un refine AI-DLC** — desviando el código de los artefactos de Unit 1 (que seguían describiendo el middleware como presente). Restaurado en `fa43333`, lo que re-alinea código y documentación.
- El 404 de confirmación de email se debía a redirecciones a `/auth/sign-in` (ruta inexistente; el login vive en el route-group `(auth)` → `/sign-in`). Corregido.
**Resiliencia (loop de redirección, `9e22350`)**: con `/matches` como home gateada, un usuario autenticado **sin fila en `profiles`** (trigger `handle_new_user` no ejecutado: usuario previo al trigger o migraciones no desplegadas) provocaba `ERR_TOO_MANY_REDIRECTS` (proxy → `/onboarding/profile` → `redirect('/sign-in')` → proxy → `/matches`). Mitigado en código: `getOrCreateProfile()` auto-crea la fila (upsert idempotente) y la página de onboarding distingue "sin sesión" (→ `/sign-in`) de "fila ausente" (auto-sana). **Deuda de datos en prod** (ver CF-6 / Operations): ejecutar `prisma migrate deploy` (instala el trigger para futuros signups) y backfill de `profiles` para usuarios de `auth.users` sin fila.
**Pendiente (no aprobado por el usuario, 2026-06-11)**: migrar la confirmación de email del flujo PKCE a `token_hash` + `verifyOtp` para resistir Outlook SafeLinks / cross-device.

---

## Estado
| ID | Tema | Destino | Estado |
|---|---|---|---|
| CF-1 | Light/Dark/System theme | Unit 2 NFR | Pregunta añadida al plan NFR de Unit 2 |
| CF-2 | Banderas SVG | Unit 4 | **Aplicado**: `lipis/flag-icons` → `public/flags/`, `pnpm sync:flags`, `pnpm check:flags` 48/48 |
| CF-3 | Seed países + código 3 chars | Unit 4 | **Aplicado**: seed de 48 selecciones con trigrama FIFA + `flagKey` local |
| CF-4 | Competition extensible | Unit 4 | Aplicado en modelo `Competition`/`CompetitionPhase`/`Match` |
| CF-5 | Glosario copy español internacional | Transversal | Aplicado a UI/contenido/docs; mantener en futuros cambios |
| CF-6 | Estrategia de migraciones (Prisma vs supabase/migrations) | Operations | **Aprobada + implementada**; falta `migrate deploy` en prod |
| CF-7 | Middleware `proxy.ts` (Next 16) + home autenticada `/matches` | Unit 1 + Unit 2 | **Aplicado** (`fa43333`): `proxy.ts` restaurado; destino post-auth `/matches`. Pendiente opcional: `token_hash`/`verifyOtp` |
