# Changelog

Todas las funcionalidades notables de Liga Mundial — World Cup 2026 Prediction Game.

El formato sigue [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- **Seguridad** — Tarjeta de gestión de passkeys en Profile → Security.
- **Seguridad** — Cuentas eliminadas ya no pueden iniciar sesión (email/password ni Google): gate por `deletedAt` en sign-in y callback OAuth, más el claim `account_deleted` del Custom Access Token Hook para expulsar sesiones vivas en el middleware.
- **Predicciones** — Visibilidad de predicciones entre miembros del pool antes del partido.
- **Fixture** — Agrupación de partidos por día local del usuario (timezone del navegador).

### Fixed

- **Pools** — Búsqueda de invitación por nickname ahora coincide por subcadena (no solo prefijo) y admite afinar con `Nombre#1234`; antes solo aparecían usuarios cuyo apodo empezaba por lo escrito.
- **Auth** — Avatar de Google se refresca en cada login para mantener la URL vigente.
- **Sync** — Eliminada restricción `@unique` en `Team.providerTeamId` para resolver conflictos de upsert.
- **Admin** — Contraste del selector de sync corregido en dark mode.

### Changed

- **Auth** — Al eliminar la cuenta se libera el nickname (`nicknameBase`/`nicknameDiscriminator` a `null`): el índice único no consideraba `deletedAt`, por lo que antes el apodo quedaba reservado de forma permanente.
- **Pools** — Predicciones en pool usan timezone del navegador en lugar de UTC.

---

## [0.3.0] — 2026-06-17

### Added

- **Scoring** — Puntaje acumulativo con visibilidad detallada por partido (exacto 5 pts, resultado +2 pts, goles acertados +1 pt c/u, penales +1 bonus).
- **Admin** — Cache inmediata post-mutación de resultados para reflejar puntajes sin revalidación manual.
- **Admin** — Refinamiento de etiquetas y extracción de equipos en panel de sync.
- **Admin** — Derivación automática de ganador de penales desde el marcador en ForceResultDialog.
- **Performance Fase 3** — Eliminación de round-trips de auth por request y optimización de conexiones/queries de DB.
- **AI-DLC** — Documentación de 38 unidades de trabajo completadas en execution-plan y matriz de dependencias.

### Changed

- **Refactor** — Formateo de fechas unificado en `lib/format-date.ts`.
- **Docs** — Copy acumulativo de scoring en landing, reglas y match summary.

---

## [0.2.0] — 2026-06-16

### Added

- **Competition** — Seed de partidos World Cup 2026 desde football-data.org (1 llamada a la API, idempotente por `providerMatchId`).
- **Competition** — Snapshot offline como respaldo cuando la API no está disponible.
- **Competition** — Auto-sanado de identidad de equipos al corregir `fifaCode` (ej: Uruguay URU).
- **Matches** — Colapsado de partidos de días anteriores tras aplicar un filtro.
- **Matches** — Contador de "partidos anteriores" basado en cantidad de partidos, no jornadas.
- **Admin** — Revertir un override de resultado también revierte el puntaje de todos los usuarios en ese partido.
- **AI-DLC** — Unidad 32 documentada: seed auto-sanador.

### Fixed

- **Competition** — `providerCompetitionId` del seed alineado con football-data.org.
- **Competition** — `fifaCode` de Uruguay corregido de URU a URY.

---

## [0.1.0] — 2026-06-15

### Added

- **Sync** — Provider football-data.org para sincronización de resultados de partidos (Unit 25).
- **i18n** — Selector de idioma en la interfaz.
- **i18n** — Cambio de idioma desde el cliente sin recarga completa.
- **Pools** — Unirse a una liga en cualquier momento, no solo durante la inscripción inicial (Unit 23).
- **Performance Fase 2** — Optimizaciones de query, pool de conexiones e índices en DB (Units 26-27).
- **Performance Fase 1** — `connection_limit=1`, Suspense + loading states, caché de perfil, lazy loading de `ScoringCalc`, optimización de avatar.
- **Cache** — Deduplicación de `getUser` + caché de fixture y ranking global (Unit 22).

---

## [0.0.1] — 2026-06-10 / 2026-06-14

### Added

- **Auth** — Email/password, Google OAuth, MFA (TOTP), passkeys (WebAuthn). (Unit 1)
- **Auth** — Passkeys migrados a la API nativa de Supabase, eliminando `@simplewebauthn/browser`. (Unit 20)
- **Auth** — Confirmación única de email al cambiar de correo (solo se confirma el nuevo). (Unit 19)
- **Auth** — Eliminación real de cuenta con limpieza de datos. (Unit 21)
- **Auth** — Confirmación de emails con `token_hash` + `verifyOtp` en vez de PKCE.
- **Profile** — Nickname `base#discriminator`, avatar (Google photo / default set / custom upload), verificación.
- **Onboarding** — Landing page, centro de reglas (MDX via Content Collections), theming, i18n. (Unit 2)
- **Onboarding** — Gate que fuerza completar perfil antes de acceder a la app.
- **Onboarding** — Fixture inicial con partidos ordenados por fecha.
- **Competition** — Fixture por fases (grupos/knockout), datos desde football-data.org. (Unit 3-4)
- **Competition** — Seed del Mundial 2026 completo con banderas SVG locales sincronizadas.
- **Predictions** — Predicción de resultado exacto, editable hasta el inicio del partido. (Unit 5)
- **Predictions** — Selector de ganador en penales para fases de knockout.
- **Scoring** — Puntaje determinístico con cálculo en tiempo real. (Unit 6)
- **Rankings** — Rankings por liga, posiciones empatadas con desempate por orden de predicción.
- **Rankings** — Ranking global con penales en la calculadora. (Unit 14)
- **Pools** — Grupos públicos/privados (hasta 100 miembros), token de invitación, directorio público. (Unit 3-4)
- **Pools** — Preservación de destino de invitación y join público tras login. (Unit 13)
- **Admin** — Dashboard de sync, override manual de resultados, recálculo de puntajes. (Unit 7)
- **UI** — Sistema de diseño multi-tema con Tailwind CSS v4 + shadcn/ui. (Unit 8)
- **UI** — App shell con chrome global, navegación y sidebar. (Unit 11)
- **Email** — Plantillas de email transaccional de auth versionadas en el repositorio. (Unit 9)
- **Notificaciones** — Web push configurables para recordatorios de partidos. (Unit 10)

### Fixed

- **Auth** — Rutas de auth devolvían 404 por prefijo `/auth/` del route group.
- **Auth** — Loop de redirección en onboarding sin perfil completado.
- **Auth** — Crash de UUID inválido en fixture sin sesión activa.
- **Auth** — Sincronización de verificación de perfil entre auth y DB.
- **Profile** — Avatar y nickname ahora se reflejan correctamente tras cambio.
- **Landing** — Copy del CTA principal ajustado.

### Changed

- **DB** — Schema migrado a Prisma migrations (desde SQL migrations de Supabase).
- **DB** — `directUrl` configurado para migraciones.

---

## [Pre-release] — 2026-06-01 / 2026-06-09

### Foundation

- **Stack** — Next.js 16 App Router + TypeScript + Tailwind CSS v4 + shadcn/ui.
- **Auth** — Supabase Auth (email, Google OAuth, MFA, passkeys).
- **DB** — PostgreSQL 18 (Supabase) + Prisma 7 ORM.
- **Tooling** — Biome (format + lint), ESLint 9 flat config, Lefthook (git hooks), Commitlint + Gitmoji.
- **Testing** — Vitest (unitarios), Playwright (e2e).
- **AI-DLC** — Metodología AI-Driven Life Cycle con 38 unidades de trabajo planificadas.
- **MCP** — Generación automática de configs MCP para 8 herramientas AI (Claude Code, opencode, Cursor, Kiro, Kilocode, GitHub Copilot, Codex, Antigravity).
- **DevContainer** — Entorno de desarrollo reproducible con Docker, feature lock y postCreateCommand.
- **Prisma** — ORM configurado con generación de cliente en `src/generated/prisma`.

### Migration from Sticker Exchange

El proyecto evolucionó desde una app de intercambio de cromos (álbum Panini) hacia la plataforma de predicciones del Mundial 2026. La migración incluyó:

- Conversión del proyecto a template Next.js 16.
- Migración de stores JSON a Prisma + PostgreSQL.
- Reescritura completa del modelo de datos.
- Conservación del theme system (custom provider, sin next-themes) y patrón de Server Actions.
