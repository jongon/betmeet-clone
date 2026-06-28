# Changelog

Todas las funcionalidades notables de Liga Mundial — World Cup 2026 Prediction Game.

El formato sigue [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Changed

- **Email** — Los correos de auth (confirmación de registro, recuperación de contraseña, cambio de email) ahora los **envía la app con Resend** en lugar de Supabase: Supabase sigue generando el token pero delega el envío a un endpoint propio (`/api/auth/email-hook`) que verifica la firma del webhook y manda con el SDK de Resend. El SMTP de Supabase queda desactivado y las plantillas se versionan y renderizan en el repo. Sin cambios visibles para el usuario; el flujo de confirmación (`token_hash` → `/auth/confirm`) y el destino de invitación se conservan. Queda andamiaje para futuros correos de negocio. (Unit 72)

### Fixed

- **Sync** — El cron de fixtures ya recoge todos los partidos de eliminatorias (dieciseisavos/Round of 32 en adelante) a medida que se confirman sus fechas. El adaptador de football-data.org pedía el scope `FIXTURES` con `status=SCHEDULED`, pero el proveedor marca los partidos próximos **con fecha confirmada como `TIMED`** (deja en `SCHEDULED` solo los de fecha por definir), así que esos partidos nunca llegaban en la respuesta ni se creaban en la DB. Ahora `FIXTURES` pide `SCHEDULED,TIMED`. De paso se corrige el poll en vivo: `LIVE_STATUS` enviaba `status=LIVE` (estado interno, no válido en el proveedor) y ahora pide `IN_PLAY,PAUSED`. (Unit 73)

---

## [0.4.0] — 2026-06-25

### Added

- **Seguridad** — Tarjeta de gestión de passkeys en Profile → Security.
- **Seguridad** — Cuentas eliminadas ya no pueden iniciar sesión (email/password ni Google): gate por `deletedAt` en sign-in y callback OAuth, más el claim `account_deleted` del Custom Access Token Hook para expulsar sesiones vivas en el middleware.
- **Predicciones** — Visibilidad de predicciones entre miembros del pool antes del partido.
- **Fixture** — Agrupación de partidos por día local del usuario (timezone del navegador).
- **Realtime** — Marcadores en vivo en `/matches` y en la grilla de Predicciones del pool vía Supabase Realtime (websockets): los resultados se actualizan solos sin recarga manual tras cada sync/override; degrada limpiamente a refresco manual si Realtime no está disponible. (Unit 58)
- **Pools** — Banner «En vivo ahora» en el detalle de la liga, visible desde las pestañas Clasificación, Predicciones y Miembros: muestra el/los partido(s) en juego con marcador, badge LIVE y la predicción + puntos de cada miembro, con un CTA que lleva a la pestaña Predicciones en el día correcto. (Unit 61)
- **Leaderboard** — Proyección en vivo del ranking (pool + global) durante partidos en juego: el leaderboard se reordena según el puntaje proyectado (`pts confirmados + Σ computeScore(predicción, marcador en vivo actual)`), cada fila muestra los puntos actuales → proyectados y el cambio de posición (`sube N`/`baja N`/`igual`/`nuevo`). Respeta override de pool vs global, `preJoin` (no puntúa partidos anteriores al ingreso) y anti-sesgo (solo partidos ya iniciados). El cache confirmado no se invalida; la proyección es pura por render. El bonus de penales **no** se concede durante LIVE (`winnerTeamId` es `null` hasta FINISHED). Se actualiza en vivo vía el mismo broadcast Realtime de Unit 58. (Unit 62)
- **Pools** — El administrador (dueño) de una liga puede cambiarla de pública a privada y viceversa en cualquier momento, desde un switch «Liga pública» en la configuración de la liga: al hacerla privada deja de aparecer en el directorio público y solo se entra con el enlace de invitación; al hacerla pública aparece en el directorio (respetando la unicidad de nombre). Solo el dueño puede cambiarlo y los miembros, el token y la capacidad no se ven afectados. (Unit 65)
- **Landing** — La portada se rediseñó como una landing de producto estilo startup que explica qué se puede hacer en la app: secciones «Cómo funciona» (4 pasos), ligas públicas vs privadas, invitaciones, features, puntuación con ejemplos resueltos y un FAQ, más una banda final de registro. El header incluye navegación con anclas y scroll suave para visitantes anónimos. Todo bilingüe (es/en) y responsive. (Unit 67)
- **Leaderboard** — El ranking (global y de pool) se rediseñó como una competencia: las 5 primeras posiciones se ven distintas entre sí, las 3 primeras llevan medalla (🥇🥈🥉) y resaltado oro/plata/bronce, y la 1.ª posición celebra con una animación de serpentinas (bucle sutil, CSS puro, deshabilitada bajo `prefers-reduced-motion`). El podio se llavea por la posición mostrada, así que durante la proyección en vivo (Unit 62) se reordena con el ranking proyectado. Aplica por igual a `/rankings`, `/pools/[id]` y `/pools/[id]/leaderboard`. (Unit 70)

### Fixed

- **Auth/Pools** — Al registrarse con correo desde un enlace de invitación, el usuario ahora llega al pool tras confirmar su cuenta. Antes, el flujo activo de confirmación (`token_hash` → `/auth/confirm`) usaba una plantilla con `next=/matches` **fijo**, ignorando el `emailRedirectTo` que preservaba el destino: la cuenta quedaba creada y confirmada pero caía en `/matches`, sin unirse nunca al pool. El destino ahora viaja en `user_metadata.invite_next` (renderizado por la plantilla como `{{ .Data.invite_next }}`), que sobrevive a abrir el enlace en otro dispositivo. (Google y el login con correo ya funcionaban). (Unit 68)
- **Pools** — Búsqueda de invitación por nickname ahora coincide por subcadena (no solo prefijo) y admite afinar con `Nombre#1234`; antes solo aparecían usuarios cuyo apodo empezaba por lo escrito.
- **Auth** — Avatar de Google se refresca en cada login para mantener la URL vigente.
- **Sync** — Eliminada restricción `@unique` en `Team.providerTeamId` para resolver conflictos de upsert.
- **Admin** — Contraste del selector de sync corregido en dark mode.
- **Competition** — Eliminados partidos duplicados del 27/28 de junio (un fixture por partido, conservando el que sincroniza resultados en vivo) y consolidada la bandera de Uruguay en una sola fila (`URY`/`/flags/uy.svg`); la bandera rota ya se ve. (Unit 60)
- **Sync** — La bandera de Uruguay ya no vuelve a romperse tras cada sincronización: el adaptador de football-data.org aliasa el TLA del proveedor al código FIFA canónico (`URU → URY`) en la normalización, de modo que el enriquecimiento y el upsert resuelven siempre la fila canónica `URY`/`/flags/uy.svg` y ningún sync recrea la fila huérfana `URU` con el enlace roto que Unit 60 había eliminado. (Unit 69)
- **Fixture** — En mobile, el marcador de la lista de partidos (`/matches`) ahora se ve en una sola fila (`Scotland [Sco] 0-3 Brazil [Bra]`) en lugar de apilado verticalmente: la rejilla de 3 columnas del marcador se aplica en todos los tamaños de pantalla (antes solo a partir de `sm:`), con el marcador escalado para caber en línea en pantallas angostas. (Unit 71)

### Changed

- **Leaderboard** — La clasificación en el detalle de la liga ahora muestra hasta las primeras 20 posiciones (antes 5); el enlace a «ranking completo» aparece solo cuando la liga supera los 20 miembros.
- **Pools** — El ranking de cada liga ahora cuenta solo los puntos acumulados **dentro** de esa liga: suma únicamente los partidos jugados desde que cada miembro se unió (predicción global heredada u override del pool). Antes mostraba el puntaje global completo. El ranking global no cambia.
- **Pools** — En la grilla de "Predicciones", las celdas de partidos previos al ingreso de un miembro se muestran vacías (ícono "Aún no estaba en la liga"), de modo que los puntos visibles cuadren con el ranking de la liga.
- **Auth** — Al eliminar la cuenta se libera el nickname (`nicknameBase`/`nicknameDiscriminator` a `null`): el índice único no consideraba `deletedAt`, por lo que antes el apodo quedaba reservado de forma permanente.
- **Pools** — Predicciones en pool usan timezone del navegador en lugar de UTC.
- **Matches** — Tras la medianoche, el último partido del día (todos los del último horario) sigue visible en `/matches` hasta 1 hora antes del siguiente partido, en lugar de ocultarse el bloque entero de golpe. Solo persiste ese horario, bajo su propia fecha y arriba de los próximos; si el siguiente partido aún no tiene fecha, permanece visible. Con la pestaña abierta, la transición al cruzar la medianoche ocurre sin recarga.
- **Predicciones** — El formulario de predicción se bloquea en vivo al llegar el kickoff (en `/matches` y en la grilla/modal del pool) sin esperar a rebotar al guardar; la autoridad sigue 100% server-side. (Unit 57)
- **Pools** — El directorio público (`/pools/discover`) muestra «Ir a la liga» en las ligas a las que ya perteneces, en vez del botón «Unirme»; antes descubrías que ya eras miembro solo al pulsar Unirme. (Unit 63)
- **i18n** — El selector de idioma (es/en) se movió al header de la app como icono de globo + popover, junto a los controles de marca y tema, para hacerlo más descubrible; antes estaba escondido dentro del menú de usuario. Se conserva también el selector dentro de Ajustes/Perfil. (Unit 64)
- **i18n** — El selector de idioma también está disponible en el header de la landing (portada), para visitantes anónimos y logueados; antes solo estaba en el header de la app y el del onboarding. (Unit 66)

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
