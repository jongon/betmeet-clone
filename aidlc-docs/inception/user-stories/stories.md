# Historias de Usuario

*Nota Técnica Transversal para V2: Todas las historias relacionadas con Predicciones (Épica 3) y Puntuación (Épica 5) deben diseñarse de forma inmutable una vez iniciado el partido, previendo que en la V2 se integrarán apuestas con USDT (Solana), donde la auditabilidad e inmutabilidad son requisitos legales y técnicos.*

---

## Épica 1: Autenticación y Perfil

### US-1.1: Registro y login tradicional
**Como** visitante
**Quiero** registrarme e iniciar sesión con mi email y contraseña
**Para** poder crear mi cuenta de forma tradicional.
- **Criterios de Aceptación**:
  - El sistema valida el formato del email y la seguridad de la contraseña (min 8 chars).
  - Al registrarse, el sistema envía un email de verificación y la cuenta queda como "No Verificada".
  - Solo tras verificar el email, la cuenta pasa a "Verificada".
  - Se bloquea el acceso a funcionalidades core (predicciones, pools) si no está verificado.

### US-1.2: Autenticación con Google (Auto-verificación)
**Como** visitante
**Quiero** iniciar sesión rápidamente usando mi cuenta de Google
**Para** evitar llenar formularios y recordar contraseñas.
- **Criterios de Aceptación**:
  - El flujo OAuth de Google funciona correctamente a través de Supabase Auth.
  - La cuenta se marca inmediatamente como "Verificada" (ya que Google verifica el email).

### US-1.3: Inicio de sesión con Passkeys
**Como** usuario verificado
**Quiero** configurar e iniciar sesión con un Passkey (WebAuthn)
**Para** entrar a la aplicación de forma más rápida y segura usando la biometría de mi dispositivo.
- **Criterios de Aceptación**:
  - Desde el perfil se puede registrar un nuevo Passkey.
  - En la pantalla de login, hay opción de entrar con Passkey.
  - Flujo gestionado por Supabase Auth.

### US-1.4: Account Linking (Fusión de cuentas)
**Como** usuario con múltiples métodos de acceso
**Quiero** que si uso Google o Email con la misma dirección, entren a la misma cuenta
**Para** no perder mis quinielas ni puntos si me equivoco de método al hacer login.
- **Criterios de Aceptación**:
  - El sistema no crea cuentas duplicadas si el email coincide.
  - Supabase Auth vincula automáticamente el Identity de Google al usuario de email existente (y viceversa).

### US-1.5: Configuración de Seguridad y MFA
**Como** usuario preocupado por la seguridad
**Quiero** habilitar Autenticación de Dos Factores (MFA / TOTP)
**Para** proteger mi cuenta, especialmente pensando en la futura V2 con criptomonedas.
- **Criterios de Aceptación**:
  - El usuario puede habilitar/deshabilitar MFA desde configuración.
  - Al hacer login, si MFA está activo, se solicita el código TOTP.
  - Opcional para todos los niveles (incluso admins).

### US-1.6: Gestión de Avatar
**Como** jugador
**Quiero** poder personalizar mi foto de perfil (Avatar)
**Para** que mis amigos me reconozcan en los rankings de los pools.
- **Criterios de Aceptación**:
  - Si el usuario se registra con Google, su foto de Google se establece como avatar por defecto.
  - El usuario puede seleccionar un avatar de un "Set de Avatares por defecto" preconfigurado.
  - El usuario puede subir una foto personalizada (validando tamaño y formato).

### US-1.7: Nickname Único (Estilo Discord)
**Como** jugador
**Quiero** tener un apodo personalizado en la plataforma
**Para** identificarme en las tablas de posiciones.
- **Criterios de Aceptación**:
  - Durante el onboarding, el usuario elige un nickname base (ej: "Messi10").
  - El sistema le asigna un discriminador numérico o un ID único visible si el nombre base se repite (ej: "Messi10#4921").
  - El nickname compuesto es único en toda la base de datos y se muestra en los rankings.

---

## Épica 17: Ajuste de Copy del Landing

### US-17.1: CTA principal más directo
**Como** visitante
**Quiero** que el botón principal del landing diga "Entra a Jugar"
**Para** entender claramente que la acción me lleva a participar en la experiencia de juego.
- **Criterios de Aceptación**:
  - El CTA principal del landing no muestra "Crea mi Liga".
  - El CTA principal del landing muestra exactamente "Entra a Jugar".
  - El destino/flujo del CTA permanece igual que antes del cambio de copy.

---

## Épica 18: Confirmación Única del Cambio de Email

### US-18.1: Cambio de email confirmado solo en el correo nuevo
**Como** usuario que cambia su correo en el Perfil
**Quiero** confirmar únicamente el correo nuevo y que la notificación del cambio llegue solo a ese correo
**Para** no depender de tener acceso al correo antiguo ni recibir correos innecesarios en él.
- **Criterios de Aceptación**:
  - Al solicitar el cambio, solo el correo **nuevo** recibe un enlace de confirmación.
  - El correo **antiguo** no recibe correo ni debe confirmar nada.
  - El cambio se aplica al confirmar ese único enlace.
  - El copy del Perfil describe la confirmación única (no menciona "ambos" correos).

---

## Épica 19: Passkeys con la API nativa de Supabase

> Refine de US-1.3 (Inicio de sesión con Passkeys). No reinicia la historia original;
> ajusta el mecanismo técnico tras un bug en vivo.

### US-19.1: Registrar y usar passkeys sin error de MFA
**Como** usuario en el onboarding (o en la pantalla de login)
**Quiero** registrar un passkey y luego iniciar sesión con él sin recibir el error "MFA enroll is disabled for WebAuthn"
**Para** poder autenticarme con la biometría/PIN de mi dispositivo de forma fluida.
- **Criterios de Aceptación**:
  - Registrar un passkey en el onboarding ya no falla con "MFA enroll is disabled for WebAuthn".
  - El registro usa la API nativa de Passkeys de Supabase (`registerPasskey()`), no el factor MFA-WebAuthn.
  - El login usa `signInWithPasskey()` con credenciales descubribles (sin pedir email ni listar factores).
  - El cliente habilita `auth.experimental.passkey = true`, coincidiendo con el toggle "Enable Passkey authentication" del dashboard.

---

## Épica 20: Eliminación real de la cuenta

> Refine de conformidad sobre el borrado de cuenta (Unit 1 · WF-11 / RULE-SEC-03). No
> reinicia la historia original; restaura el comportamiento ya aprobado tras un bug en vivo.

### US-20.1: Eliminar la cuenta la elimina de verdad
**Como** usuario que elimina su cuenta desde `settings/security`
**Quiero** que la cuenta se elimine de verdad (no poder volver a iniciar sesión y que mi email quede libre)
**Para** confiar en que mis datos de acceso se han borrado.
- **Criterios de Aceptación**:
  - Tras confirmar, el registro de `auth.users` se elimina vía la Admin API (no solo un `signOut`).
  - El usuario no puede volver a iniciar sesión y todas sus sesiones quedan invalidadas.
  - El email queda libre para volver a registrarse.
  - El `Profile` permanece soft-deleted (`deleted_at`) para conservar el historial de predicciones y scores.
  - Si la purga del `auth.users` falla, se muestra un error y no se redirige (la acción no finge éxito).

---

## Épica 21: Recomendaciones de Performance (Unit 22 — añadida vía `/aidlc:refine`)

> Análisis / recomendación (no implementación aprobada). No reinicia etapas. Análisis
> completo en `construction/unit-22-performance-recommendations/performance-analysis.md`.

### US-21.1: Pantallas autenticadas que cargan rápido
**Como** usuario de la aplicación
**Quiero** que las pantallas autenticadas (sobre todo `/matches` y `/rankings`) carguen rápido
**Para** usar la app sin notar lentitud.
- **Criterios de Aceptación**:
  - Los round-trips de validación de auth por navegación bajan de 3 a 1 (dedup con `cache()` + `getClaims()` local).
  - El fixture estático y los rankings estables se sirven desde caché invalidada por evento (sync / recálculo) en lugar de recomputarse por request.
  - En producción, la conexión de BD usa el transaction pooler (6543); `DIRECT_URL` queda solo para migraciones.
  - Las optimizaciones no cambian el comportamiento funcional ni el resultado de las pantallas.

---

## Épica 22: Unirse a una liga en cualquier momento (Unit 23 — añadida vía `/aidlc:refine`)

> Cambio de regla de negocio (no reinicia etapas). Levanta el congelamiento de **toda**
> la membresía: unir, salir, expulsar y eliminar ya **no** se congelan por el inicio del torneo.

### US-22.1: Gestionar mi membresía aunque la competición ya haya empezado
**Como** jugador
**Quiero** unirme, salir, expulsar o eliminar una liga en cualquier momento, incluso con la competición en curso
**Para** gestionar mi participación sin que el inicio del torneo me lo impida, asumiendo que no puntúo los partidos ya cerrados.
- **Criterios de Aceptación**:
  - El ingreso desde el directorio público y por token/link de invitación funciona aunque la competición ya haya empezado.
  - Las invitaciones dirigidas (nickname/email) pueden aceptarse después del inicio de la competición.
  - Salir (no-owner), expulsar (owner) y eliminar (owner) la liga funcionan en cualquier momento; ya no se ocultan ni rechazan por congelamiento.
  - Siguen aplicando el límite de capacidad, la unicidad de membresía y la autorización (solo el owner expulsa/elimina; el owner no "sale").
  - El usuario que se une tarde no recibe puntos de partidos cuyo cierre por kickoff ya pasó (bloqueo por partido de Unit 5), sin que eso impida unirse.

---

## Épica 23: Internacionalización y selector de idioma (Unit 24 — añadida vía `/aidlc:refine`)

> Refine transversal post-construcción. No reinicia Units 1–23. Implementa la
> infraestructura bilingüe prevista desde Unit 2 (sin prefijo de URL) y corrige la
> mezcla actual de copy en español/inglés.

### US-23.1: Elegir idioma de la aplicación
**Como** usuario
**Quiero** cambiar el idioma entre español e inglés
**Para** usar la aplicación en el idioma que prefiera.
- **Criterios de Aceptación**:
  - El español (`es`) es el idioma por defecto.
  - El usuario puede seleccionar `Español` o `English` desde el `UserMenu` y desde `Settings/Profile`.
  - El cambio se aplica sin cambiar la URL actual.
  - La preferencia se guarda en cookie y en el perfil del usuario para persistir entre sesiones y dispositivos.

### US-23.2: Ver una experiencia homogénea sin mezcla de idiomas
**Como** usuario
**Quiero** que la interfaz no mezcle copys en español e inglés
**Para** entender cada pantalla sin cambios de idioma inesperados.
- **Criterios de Aceptación**:
  - En `es`, los textos visibles están en español internacional, respetando CF-5 y préstamos naturales como `email`, `passkey` y `nickname`.
  - En `en`, los textos visibles están en inglés y usan los equivalentes de producto correctos (`League`, `Prediction`, `Match start`, `Invitation`) salvo préstamos/términos técnicos que se mantienen.
  - Labels, placeholders, botones, errores, toasts, empty states, metadata y `aria-label` salen del diccionario tipado.

### US-23.3: Leer el Centro de Reglas en mi idioma
**Como** usuario
**Quiero** consultar las reglas en español o inglés según mi preferencia
**Para** entender cómo jugar y puntuar sin depender de otro idioma.
- **Criterios de Aceptación**:
  - El contenido MDX de reglas existe en `content/rules/es/` y `content/rules/en/`.
  - `/rules` muestra los documentos del locale activo sin cambiar la ruta.
  - El build valida que las versiones por idioma tengan frontmatter compatible y no rompan la colección tipada.

### US-23.4: Mantener URLs estables al cambiar idioma
**Como** usuario que comparte o guarda enlaces
**Quiero** que las URLs existentes sigan funcionando igual
**Para** no romper enlaces ni navegación al activar inglés.
- **Criterios de Aceptación**:
  - No se introducen rutas `/es/*` ni `/en/*` en esta unidad.
  - Todas las rutas existentes permanecen intactas.
  - El locale activo se resuelve por cookie/perfil y no por path.

---

## Épica 25: Performance Fase 1 — Quick Wins (Unit 26 — añadida vía AI-DLC refine)

> Implementación de optimizaciones de bajo riesgo y alto impacto (~30min) detectadas
> en el análisis de latencia (2-3s por request). No reinicia etapas aprobadas. Detalle
> en `construction/unit-26-phase1-performance/functional-design.md`.

### US-25.1: Navegación más rápida en las pantallas principales
**Como** usuario de la aplicación
**Quiero** que las pantallas principales (`/matches`, `/pools/[id]`, `/rankings`) carguen en <1s
**Para** navegar por la app sin esperas de 2-3s.
- **Criterios de Aceptación**:
  - `getProfile()` devuelve solo las columnas necesarias con `select` y se deduplica con `React.cache()`, eliminando lecturas redundantes de BD en layout + AppHeader + page.
  - `/pools/[id]` ejecuta sus queries independientes en paralelo con `Promise.all()` en lugar de secuencialmente.
  - `connection_limit` sube de 1 a 3, permitiendo queries concurrentes dentro del mismo request a través del pooler de Supabase.
  - El modelo `Match` tiene índices en `homeTeamId` y `awayTeamId`, acelerando los JOINs del fixture.
  - Ningún cambio funcional: la UI, los datos y el comportamiento de las pantallas permanecen idénticos.
  - Suite de tests verde, build OK.

---

## Épica 26: Performance Fase 2 — Estructural (Unit 27 — añadida vía AI-DLC refine)

> Implementación de optimizaciones estructurales (~1h): estrategia de caché en
> `/matches`, índices en Profile/ProviderSyncRun, refactor N+1 y caché de queries
> frecuentes. No reinicia etapas aprobadas. Detalle en
> `construction/unit-27-phase2-performance/functional-design.md`.

### US-26.1: Navegación instantánea en toda la app
**Como** usuario de la aplicación
**Quiero** que la navegación se sienta instantánea (<300ms) en todas las pantallas
**Para** usar la app sin percibir esperas.
- **Criterios de Aceptación**:
  - `/matches` ya no usa `force-dynamic`; la página usa `revalidate` con TTL corto y los datos de predicción por-usuario se mantienen frescos sin forzar cold starts.
  - `Profile.deletedAt` tiene un índice parcial (`WHERE deleted_at IS NULL`) que acelera la snapshot de ranking global y la búsqueda de disponibilidad de nickname.
  - `ProviderSyncRun` tiene índice `(scope, status, finishedAt)` y el dashboard de admin usa una sola query en lugar de 6 secuenciales (elimina el N+1).
  - Las queries frecuentes (`getMyPools`, `getPoolDetail`) están deduplicadas por render con `React.cache()`.
  - Latencia objetivo <300ms en páginas principales, medida con TTFB en Vercel Analytics.
  - Ningún cambio funcional en pantallas, datos ni comportamiento.
  - Suite de tests verde, build OK.

---

## Épica 24: Sync con football-data.org (Unit 25 — añadida vía `/aidlc:refine`)

> Reemplaza el stub `ApiFootballProvider` por `FootballDataProvider` implementando el
> contrato `CompetitionProvider` existente. No reinicia etapas aprobadas. Detalle en
> `construction/unit-25-football-data-sync/functional-design.md`.

### US-24.1: Sincronizar resultados desde una fuente real
**Como** administrador
**Quiero** que la sincronización traiga fixtures y resultados desde football-data.org
**Para** que la competición refleje datos reales sin captura manual.
- **Criterios de Aceptación**:
  - El provider consulta `GET /v4/competitions/WC/matches?season=2026` con `X-Auth-Token` (`FOOTBALL_DATA_KEY`).
  - Cada match del API se mapea a `NormalizedMatch` (status vía `mapFootballDataStatus`, marcadores `score.fullTime.* ?? null`).
  - El scope del sync (`FIXTURES`/`LIVE_STATUS`/`RESULTS`/`FULL`) filtra por `status`/`dateFrom`/`dateTo`.
  - El orquestador escribe `provider="FOOTBALL_DATA"` en `ProviderSyncRun`; el 429 se traduce a `RATE_LIMITED`.
  - Sin cambios de schema, migraciones ni rutas. Suite de tests verde.

---

## Épica 27: Persistencia de matches en sync-orchestrator (Unit 28 — añadida vía `/aidlc:build`)

> El orquestador buscaba resultados pero no persistía matches en la BD. No reinicia
> etapas aprobadas. Detalle en
> `construction/unit-28-sync-match-persistence/functional-design/`.

### US-27.1: Que la sincronización persista los partidos en la base de datos
**Como** administrador
**Quiero** que al sincronizar se creen y actualicen los partidos en la BD
**Para** que el fixture y los resultados queden disponibles para los usuarios.
- **Criterios de Aceptación**:
  - `syncMatchesToDB()` identifica cada match por `providerMatchId` (UPDATE si existe).
  - Un match inexistente se CREA solo si su status es `SCHEDULED` o `LIVE`; los `FINISHED`/`POSTPONED`/`CANCELLED` inexistentes se SKIPean (no se importan resultados históricos en una BD fresca).
  - El UPDATE actualiza status y marcadores; la fase se resuelve por nombre.
  - Las notificaciones de inicio/fin de partido se disparan best-effort; `itemsUpdated` = matches procesados.
  - El seed separa estructura (`seedCompetitionStructure()`) de matches; backward-compat de `seedWorldCup2026()`. Suite de tests verde.

---

## Épica 32: Extracción de equipos desde API en seed/sync (Unit 33 — añadida vía refine)

> El `FootballDataProvider` devolvía `teams: []`, por lo que el fallback del snapshot tampoco contenía
> datos de equipos. No reinicia etapas aprobadas. Detalle en
> `construction/unit-29-seed-matches-football-data/functional-design.md` y
> `construction/unit-32-seed-team-reconciliation/functional-design.md`.

### US-33.1: Que el seed/sync extraiga equipos desde los partidos del API
**Como** administrador
**Quiero** que al ejecutar el seed o sync, los equipos se extraigan automáticamente de los partidos del API
**Para** que el snapshot de respaldo contenga datos de equipos y los partidos puedan resolver `homeTeamId`/`awayTeamId` incluso sin API.
- **Criterios de Aceptación**:
  - `FootballDataProvider.fetch()` devuelve un array `teams` con los equipos únicos extraídos de los partidos.
  - Los equipos se enriquecen con datos canónicos de `WORLD_CUP_2026_TEAMS` (`name`, `isoAlpha2`, `flagKey`, `flagPath`).
  - El snapshot commiteado incluye el array `teams` (48 equipos del Mundial 2026).
  - El fallback offline del seed puede resolver `homeTeamId`/`awayTeamId` sin depender de la API.
  - Idempotente: si los datos del API cambian, el siguiente seed/sync actualiza la fila `Team` (keyed por `fifaCode`).
  - Suite de tests verde (football-data.test.ts, seed-matches.test.ts).

---

## Épica 33: Códigos FIFA en `/admin/matches` (Unit 34 — añadida vía refine)

> Refine UI-only sobre Unit 7. No reinicia etapas aprobadas. Detalle en
> `construction/unit-7-admin-observability/functional-design/frontend-components.md`.

### US-34.1: Ver partidos admin por código de 3 letras
**Como** administrador
**Quiero** que los partidos en `/admin/matches` se vean como `BRA vs ARG`
**Para** identificar y operar resultados rápidamente sin leer nombres largos de equipos.
- **Criterios de Aceptación**:
  - Las filas de `/admin/matches` muestran equipos resueltos con `homeTeam.fifaCode` y `awayTeam.fifaCode` en formato `XXX vs YYY`.
  - Los diálogos/controles de override reutilizan la misma etiqueta compacta del partido.
  - Si un equipo aún no está resuelto, se conserva el placeholder existente para ese lado.
  - No cambia `/matches` público, scoring, sync ni seed.

---

## Épica 2: La Competición (Mundial 2026)

### US-2.1: Visualización del Fixture
**Como** jugador
**Quiero** ver el calendario completo de partidos agrupados por fases (Fase de Grupos, Octavos, etc.)
**Para** saber qué partidos están próximos a jugarse y debo predecir.
- **Criterios de Aceptación**:
  - Los partidos se muestran con fecha, hora local del usuario y equipos participantes.
  - Filtros por grupo o por fase eliminatoria.

### US-2.2: Estado del Partido
**Como** jugador
**Quiero** ver claramente si un partido está "En Espera", "En Juego" (con marcador en vivo) o "Finalizado"
**Para** saber si aún puedo modificar mi predicción y cómo va el resultado.
- **Criterios de Aceptación**:
  - La UI diferencia visualmente los estados.
  - Partidos "En Juego" no permiten modificar predicciones.

### US-2.3: Desbloqueo de Llaves
**Como** jugador
**Quiero** que los partidos de las fases siguientes (octavos, cuartos, etc.) aparezcan automáticamente cuando se definan los cruces
**Para** poder predecir sobre las llaves reales del torneo.
- **Criterios de Aceptación**:
  - Los partidos tipo "1ro Grupo A vs 2do Grupo B" no permiten predicción hasta que los equipos estén definidos oficialmente por la API.

---

## Épica 3: Quinielas y Predicciones

### US-3.1: Predecir marcador
**Como** jugador
**Quiero** ingresar mi pronóstico de goles para el equipo A y el equipo B en un partido futuro
**Para** participar en la quiniela.
- **Criterios de Aceptación**:
  - Interfaz simple para sumar/restar goles.
  - Validación de que el partido aún no ha iniciado (según timestamp del servidor).

### US-3.2: Modificar predicción
**Como** jugador
**Quiero** poder cambiar mi pronóstico las veces que quiera antes del partido
**Para** ajustar mi estrategia si hay noticias de último momento (ej. lesiones).
- **Criterios de Aceptación**:
  - Se guarda el último estado de la predicción justo al momento del "Kickoff".
  - Una vez iniciado el partido, el endpoint de modificación devuelve error 403.

### US-3.3: Predicción de Penales (Fases Knockout)
**Como** jugador
**Quiero** que en partidos de eliminación directa, si predigo un empate, el sistema me pregunte quién ganará en penales
**Para** poder ganar puntos adicionales si acierto el resultado de la tanda.
- **Criterios de Aceptación**:
  - Esta opción SOLO aparece en partidos fuera de la fase de grupos.
  - La opción SOLO se habilita si la predicción de goles es un empate (ej. 1-1).
  - Permite seleccionar cuál de los dos equipos pasará en penales (sin poner cantidad de penales).

### US-3.4: Visualización de predicciones
**Como** jugador
**Quiero** ver mis predicciones junto al resultado real del partido
**Para** saber por qué gané o perdí puntos.
- **Criterios de Aceptación**:
  - Mostrar claramente la predicción del usuario vs el marcador real.
  - Mostrar los puntos ganados en ese partido específico desglosado.

---

## Épica 4: Pools

### US-4.1: Creación de Pool
**Como** jugador
**Quiero** crear un Pool (público o privado) y definir su límite de participantes
**Para** competir contra un grupo específico de personas.
- **Criterios de Aceptación**:
  - Se define nombre del Pool, tipo (Público/Privado) y capacidad máxima (hasta 100).
  - El creador se convierte en "Admin del Pool".
  - El sistema genera un link de invitación único (o código).

### US-4.2: Unirse a un Pool
**Como** jugador
**Quiero** buscar pools públicos o ingresar a través de un link de invitación privado
**Para** entrar en la competición.
- **Criterios de Aceptación**:
  - Los pools públicos tienen un directorio de búsqueda.
  - Los pools privados requieren el código/link.
  - Un usuario puede estar en múltiples pools simultáneamente.
  - No se puede entrar si se alcanzó el límite máximo de participantes configurado.
  - Un usuario puede unirse **en cualquier momento**, incluso con la competición ya iniciada (FR-REFINE-23 / US-22.1). El ingreso ya **no** se congela por el inicio del torneo.

### US-4.3: Expulsar Miembros (Admin de Pool)
**Como** admin de un pool
**Quiero** poder eliminar a un participante indeseado
**Para** mantener el control de mi grupo privado.
- **Criterios de Aceptación**:
  - Solo el admin del pool puede hacerlo.
  - ~~Solo se puede expulsar a alguien ANTES de que comience el primer partido del Mundial.~~ **Actualizado por FR-REFINE-23 (US-22.1)**: expulsar (como unir/salir/eliminar) se permite **en cualquier momento**; las listas ya **no** se congelan por el inicio del torneo.

---

## Épica 5: Puntuación y Rankings

### US-5.1: Cálculo de Puntos
**Como** sistema
**Quiero** calcular los puntos de todos los usuarios cuando finaliza un partido
**Para** actualizar los rankings.
- **Criterios de Aceptación (Lógica Core)**:
  - Acertar marcador exacto = 5 puntos.
  - Si no hay marcador exacto, acertar resultado (ganador/empate) suma 2 puntos.
  - Si no hay marcador exacto, acertar la cantidad de goles de cada equipo suma 1 punto por equipo acertado; estos puntos se acumulan con los 2 puntos de resultado correcto.
  - Ejemplo: real `BRA 2 - 1 ARG`, predicción `BRA 3 - 2 ARG` = 3 puntos (2 por ganador + 1 por gol de ARG).
  - Fallar todo = 0 puntos.
  - En fases knockout: predecir ganador de penales correcto (siendo que el partido quedó empatado) = +1 punto adicional al usuario.

### US-5.2: Ranking por Pool
**Como** jugador
**Quiero** ver una tabla de posiciones (Leaderboard) específica para cada Pool en el que participo
**Para** saber en qué posición voy contra mis amigos.
- **Criterios de Aceptación**:
  - El ranking ordena a los participantes por puntos totales de mayor a menor.
  - En caso de empate en puntos, ambos usuarios comparten la misma posición (ej. si hay dos 1ros, el siguiente es el 3ro. O todos se muestran con un "1"). No hay criterios de desempate.
  - Se muestra el Nickname y el Avatar.

---

## Épica 6: Panel de Administración

### US-6.1: Sincronización con el proveedor de resultados (football-data.org desde Unit 25)
**Como** administrador del sistema
**Quiero** ver el estado de sincronización con la API de resultados en vivo
**Para** asegurarme de que los datos fluyen correctamente a la plataforma.
- **Criterios de Aceptación**:
  - Dashboard que muestra última conexión exitosa, partidos actualizados y estado de los webhooks/crons.

### US-6.2: Forzar Resultado (Fallback)
**Como** administrador del sistema
**Quiero** poder ingresar el marcador de un partido manualmente
**Para** resolver problemas si la API externa falla o reporta datos incorrectos en un momento crítico.
- **Criterios de Aceptación**:
  - Opción de sobrescribir el marcador "oficial" del sistema.
  - Al cambiarlo manualmente, se debe disparar el recálculo de puntos (US-5.1) para todos los usuarios.

---

## Épica 7: Design System y Experiencia Visual (Unit 8 — añadida vía `/aidlc-refine`)

### US-7.1: Identidad visual deportiva
**Como** usuario
**Quiero** una interfaz moderna con una identidad deportiva y enérgica
**Para** que la app se sienta profesional y propia del mundo del fútbol, no una plantilla genérica.
- **Criterios de Aceptación**:
  - Paleta y tipografía con personalidad propia (no la gris neutra por defecto).
  - Aplicada de forma consistente vía tokens semánticos, sin reescribir componentes.

### US-7.2: Cambio de tema claro/oscuro y de personalidad
**Como** usuario
**Quiero** poder elegir entre claro/oscuro y entre variantes visuales (deportiva, moderna, premium)
**Para** adaptar la apariencia a mi gusto.
- **Criterios de Aceptación**:
  - Las 6 combinaciones (marca × claro/oscuro) son válidas y legibles.
  - La preferencia persiste tras recargar y no produce flash (FOUC) al cargar.
  - Contraste AA, foco visible y controles navegables por teclado.

## Épica 8: Emails Transaccionales (Unit 9 — añadida vía `/aidlc-refine`)

### US-8.1: Envío fiable de correos de auth
**Como** equipo del producto
**Quiero** que los correos de verificación, reset y cambio de email salgan por Resend (Custom SMTP de Supabase)
**Para** tener entregabilidad de producción sin construir infraestructura de email propia.
- **Criterios de Aceptación**:
  - Resend configurado como Custom SMTP en Supabase; en dev se usa el sandbox `resend.dev`.
  - En producción, dominio propio verificado en Resend (DKIM/SPF/DMARC) antes de salir del sandbox.
  - Sin dependencias npm nuevas; el código de disparo sigue siendo el SDK de Supabase ya existente.

### US-8.2: Plantillas de auth con identidad de marca, versionadas en el repo
**Como** desarrollador
**Quiero** que las plantillas HTML de los correos de auth vivan en el repositorio y se desplieguen a Supabase
**Para** versionarlas, revisarlas en PR y alinearlas con la identidad visual (Unit 8), aunque Supabase las hospede.
- **Criterios de Aceptación**:
  - `supabase/templates/{confirmation,recovery,email_change}.html` con estilos inline y placeholders de Supabase (`{{ .ConfirmationURL }}`, etc.).
  - `supabase/config.toml` referencia cada plantilla vía `content_path` y define su `subject`.
  - No cambia el runtime de la app (los `redirectTo` siguen usando `NEXT_PUBLIC_SITE_URL`).

### US-8.3: Catálogo de notificaciones de negocio (backlog)
**Como** jugador
**Quiero** recibir avisos relevantes (invitación a pool, recordatorio de partido, mis puntos de la jornada, cambios de ranking)
**Para** mantenerme enganchado a mis quinielas.
- **Criterios de Aceptación** (post-MVP, requiere SDK de Resend):
  - Catálogo definido (Grupo B en FR-EMAIL-01): invitación a pool, alta/expulsión de miembro, recordatorio pre-kickoff, resumen de puntos, cambio de ranking, recálculo por override, alerta de sync a admins.
  - Los correos sin request HTTP de usuario (recordatorios, resumen, ranking, alertas) se disparan desde un job/cron, no inline.
  - Preferencias de notificación por usuario antes de activar envíos masivos.

---

## Épica 9: Notificaciones Web Push (Unit 10 — añadida post-construction)

### US-9.1: Activar web push por dispositivo
**Como** usuario verificado
**Quiero** activar notificaciones web push en mi navegador
**Para** recibir avisos importantes aunque no tenga la app abierta.
- **Criterios de Aceptación**:
  - El sistema solicita permiso del navegador solo por acción explícita del usuario.
  - Si el permiso es denegado, la UI explica cómo reactivarlo sin bloquear la app.
  - Una cuenta puede registrar más de un dispositivo/navegador.

### US-9.2: Configurar preferencias por tipo de notificación
**Como** usuario
**Quiero** elegir qué notificaciones recibir
**Para** evitar ruido y recibir solo avisos útiles.
- **Criterios de Aceptación**:
  - Puedo activar/desactivar: inicio de partido, final de partido, invitación a liga/pool, subida en ranking global y gol anotado.
  - Las preferencias se guardan por usuario y aplican a todos sus dispositivos.
  - Desactivar un tipo evita nuevos envíos de ese tipo sin borrar la suscripción del dispositivo.

### US-9.3: Avisos de estado del partido
**Como** jugador
**Quiero** recibir notificaciones cuando empieza un partido, termina o se anota un gol
**Para** seguir la competición y mis predicciones en tiempo real.
- **Criterios de Aceptación**:
  - Inicio de partido se emite cuando el estado cambia a `LIVE` o el kickoff se alcanza.
  - Final de partido se emite cuando el estado cambia a `FINISHED`.
  - Gol anotado se emite cuando el marcador cambia durante un partido `LIVE`.
  - No se envían duplicados si el sync repite el mismo estado/marcador.

### US-9.4: Aviso de invitación a liga/pool
**Como** jugador
**Quiero** recibir una notificación cuando me invitan a una liga/pool
**Para** unirme antes de que empiece la competición.
- **Criterios de Aceptación**:
  - Se soportan invitaciones dirigidas por nickname o email, manteniendo el link/código actual de invitación.
  - La notificación solo se envía al usuario invitado cuando la invitación es dirigida.
  - Los links/códigos genéricos no generan push porque no tienen destinatario conocido.
  - El contenido no expone datos de pools privados a usuarios no invitados.
  - El click abre la pantalla de invitación/join correspondiente.

### US-9.5: Aviso de subida en ranking global
**Como** jugador competitivo
**Quiero** recibir un aviso cuando subo en el ranking global
**Para** saber que mejoré mi posición tras un partido.
- **Criterios de Aceptación**:
  - La subida se detecta comparando la posición global anterior y nueva tras scoring.
  - Solo se notifica si la posición mejora; no se notifica al bajar o permanecer igual.
  - El click abre la vista de ranking global o la mejor vista disponible si el ranking global aún no tiene UI dedicada.

## Épica 10: App Shell y Navegación Global (Unit 11 — añadida vía `/aidlc-plan`)

### US-10.1: Saber que mi sesión está iniciada
**Como** usuario autenticado
**Quiero** ver mi avatar y nickname en un header presente en toda la app
**Para** tener certeza de que mi sesión está activa y de quién soy.
- **Criterios de Aceptación**:
  - El header aparece en rutas autenticadas (`/matches`, `/pools`, `/rules`, `/settings/*`) y en admin (`/admin/*`).
  - No aparece en las pantallas de auth (`(auth)`) ni en `/onboarding/*`.
  - Muestra avatar + nickname obtenidos de `getProfile()` / `getDisplayNickname()`.

### US-10.2: Cerrar sesión desde cualquier pantalla
**Como** usuario autenticado
**Quiero** un acceso visible a "Cerrar sesión" en el menú de usuario
**Para** poder salir sin tener que adivinar dónde está la opción.
- **Criterios de Aceptación**:
  - El menú de usuario incluye "Cerrar sesión" y usa la server action `signOut()` existente.
  - Tras cerrar sesión, redirige a `/sign-in`.

### US-10.3: Entrar a mi perfil y seguridad
**Como** usuario autenticado
**Quiero** acceder a mi perfil y a la configuración de seguridad desde el header
**Para** gestionar mi cuenta sin navegar a ciegas.
- **Criterios de Aceptación**:
  - El menú de usuario enlaza a `/settings/profile` y `/settings/security`.
  - Si soy administrador (`verificationStatus === "ADMIN"`), aparece también un enlace a `/admin`.

### US-10.4: Cambiar tema y personalidad dentro de la app
**Como** usuario autenticado
**Quiero** alternar claro/oscuro y la marca/personalidad desde el header
**Para** ajustar la apariencia sin volver a la landing pública.
- **Criterios de Aceptación**:
  - El header monta `ThemeToggle` y `BrandToggle` (componentes existentes, sin duplicar lógica).
  - El cambio aplica de inmediato y persiste como hoy (next-themes + `data-theme`).

### US-10.5: Navegación primaria consistente
**Como** usuario autenticado
**Quiero** enlaces claros a Partidos, Ligas y Reglas con indicación de la sección activa
**Para** moverme por la app con confianza.
- **Criterios de Aceptación**:
  - Marca/logo enlaza a `/matches`; hay enlaces a `/matches`, `/pools`, `/rules`.
  - La sección activa se marca con `aria-current`.
  - En móvil la navegación colapsa en un menú accesible por teclado.

### US-10.6: Contexto de administración
**Como** administrador
**Quiero** que en el panel de admin se note el contexto "Admin" y un regreso a la app
**Para** orientarme y volver a la experiencia de jugador fácilmente.
- **Criterios de Aceptación**:
  - El chrome en `/admin/*` refleja el contexto Admin y ofrece regreso a la app.
  - El gate de admin se mantiene (`notFound()` si no es ADMIN).

## Épica 30: Revertir override revierte el puntaje (Unit 31 — añadida vía `/aidlc:start`)

### US-30.1: Revertir un override devuelve el control a la API y revierte los puntos
**Como** administrador
**Quiero** que al pulsar "Revertir a la API" sobre un partido con override manual se reviertan también los puntos que los usuarios ganaron con ese resultado
**Para** que un override quede completamente deshecho y el resultado real de la API sea la única fuente de puntuación.
- **Criterios de Aceptación**:
  - Al revertir, se limpian los flags de override **y** el resultado manual (marcador, penales, ganador → null; `status` → `SCHEDULED`).
  - `scoreMatch()` elimina los `PredictionScore` del partido (no-scoreable, BR-6.7) → los usuarios pierden los puntos del override.
  - El próximo sync de football-data.org repuebla el resultado real y vuelve a puntuar.
  - El botón pide confirmación antes de ejecutar (acción destructiva), advirtiendo que se eliminarán los puntos.
  - El gate de admin (`getAdminUserId()`) se mantiene.

---

## Épica 38: Gestión de passkeys desde Perfil → Seguridad (Unit 38 — añadida vía refine)

> Refine post-construcción sobre Unit 1 Foundation (WF-13, RULE-SEC-02) y Unit 20
> (API nativa de passkeys). Cubre el gap entre el diseño original y la implementación:
> la gestión de passkeys desde `/settings/security` nunca se construyó. No reinicia
> etapas aprobadas.

### US-38.1: Gestionar mis passkeys desde Seguridad del Perfil
**Como** usuario verificado
**Quiero** ver, eliminar y registrar passkeys desde `/settings/security`
**Para** gestionar mis dispositivos de autenticación biométrica sin depender del onboarding y sin afectar mi MFA TOTP.
- **Criterios de Aceptación**:
  - En `/settings/security` aparece una sección "Passkeys" (bajo "Autenticación en dos pasos") con la lista de passkeys registrados.
  - Si no hay passkeys registrados, la sección muestra un mensaje y un botón "Registrar un passkey".
  - Si hay passkeys, cada uno muestra su nombre/etiqueta y un botón para eliminarlo (con confirmación).
  - El botón "Registrar un passkey" (tanto el inicial como el de añadir otro) ejecuta la misma ceremonia WebAuthn del onboarding (`registerPasskey()`).
  - Eliminar un passkey pide confirmación y usa `auth.passkey.delete(id)`.
  - Las operaciones dan feedback inmediato (loading, éxito, error) con copy i18n (`es`/`en`).
  - No se puede eliminar el último método de autenticación si deja la cuenta sin acceso (email o passkey).
  - La sección de TOTP MFA existente no se modifica (son sistemas independientes, CF-10).
   - La página sigue siendo `/settings/security`; sin cambios de ruta ni navegación.

---

## Épica 39: Sync — unique constraint conflict en `Team.providerTeamId` (Unit 39 — añadida vía refine)

> Refine post-construcción sobre Unit 25 (sync con football-data.org) y Unit 33
> (extracción de equipos desde API). Bug en producción: el sync falla con "Unique
> constraint failed on the fields: (`provider_team_id`)" en `prisma.team.upsert()`.
> Causa raíz: `upsertTeam()` usa `fifaCode` como llave, pero `providerTeamId` tiene
> `@unique`. Cuando dos equipos comparten el mismo ID numérico del API, el upsert
> intenta un CREATE que viola la restricción. `providerTeamId` nunca se usa como
> llave de búsqueda en el código. No reinicia etapas aprobadas.

### US-39.1: El sync deja de fallar por unique constraint en `providerTeamId`
**Como** administrador
**Quiero** sincronizar datos desde football-data.org sin que falle por un conflicto de `provider_team_id`
**Para** mantener los partidos y equipos actualizados desde la API externa.
- **Criterios de Aceptación**:
  - Se elimina el `@unique` de `Team.providerTeamId` en el schema de Prisma.
  - Se crea una migración que ejecuta `DROP INDEX "teams_provider_team_id_key"`.
  - Al ejecutar una sync (scope `FULL`) desde `/admin`, esta se completa sin errores de unique constraint.
  - Los tests existentes (Vitest) siguen pasando; el `providerTeamId` se sigue persistiendo normalmente.
  - El `fifaCode` sigue siendo la identidad canónica del equipo; `providerTeamId` es metadata sin restricción de unicidad.
  - Sin cambios de código en `upsertTeam`, `sync-orchestrator`, `football-data.ts`, `seed-matches.ts` ni `trigger-sync.ts`.
  - Sin cambios de UI, rutas, scoring, predicciones ni auth.

---

## Épica 40: Contraste del selector de tipo de sync en `/admin` dark mode (Unit 40 — añadida vía refine)

> Refine UI-only sobre Unit 7 y Unit 8. Bug visual: en modo oscuro, las opciones no seleccionadas del selector de scope de sync en `/admin` se camuflan con el fondo del mismo select. No reinicia etapas aprobadas.

### US-40.1: Ver claramente todos los tipos de sync en modo oscuro
**Como** administrador
**Quiero** que el selector de tipo de sincronización en `/admin` muestre todas sus opciones con contraste en modo oscuro
**Para** elegir correctamente entre `FIXTURES`, `LIVE_STATUS`, `RESULTS` y `FULL` sin confusión visual.
- **Criterios de Aceptación**:
  - En modo oscuro, al abrir el selector `admin-sync-scope`, las opciones no seleccionadas son legibles contra su fondo.
  - El valor seleccionado sigue siendo legible cuando el selector está cerrado.
  - Los scopes disponibles y el scope por defecto no cambian.
  - El botón "Sincronizar ahora" y la acción `triggerSync()` mantienen el comportamiento existente.
  - Sin cambios de permisos, rutas, schema, providers, scoring ni copy i18n.

---

## Épica 41: Predicciones visibles dentro del pool (Unit 41 — añadida vía refine)

> Feature aditivo sobre Units 3, 5 y 6. Los participantes de un pool pueden ver las predicciones de otros miembros para los partidos que ya comenzaron, agrupadas por jornada/día desde una nueva pestaña en `/pools/[id]`. No reinicia etapas aprobadas.

### US-41.1: Ver las predicciones de otros miembros del pool
**Como** miembro de un pool
**Quiero** ver las predicciones que hicieron los demás miembros para los partidos que ya empezaron
**Para** comparar mi desempeño con el de mis rivales y ver quién acertó cada resultado.
- **Criterios de Aceptación**:
  - En `/pools/[id]` aparece una tercera pestaña "Predicciones" (junto a "Clasificación" y "Miembros").
  - Las predicciones se agrupan por jornada/día calendario con el mismo criterio local que `/matches`.
  - Cada jornada muestra una tabla: filas = miembros (avatar + nickname), columnas = partidos del día que ya comenzaron.
  - Cada celda muestra la predicción del miembro (`golesLocal - golesVisitante`) y los puntos obtenidos. Si el partido está LIVE, los puntos muestran "—".
  - Las predicciones de partidos que no han comenzado (SCHEDULED, kickoff futuro) NO se muestran.
  - Si un miembro no predijo un partido, su celda muestra "—" o un indicador visual de "sin predicción".
  - Solo los miembros del pool pueden ver esta pestaña (usuarios no miembros reciben el comportamiento existente de `getPoolDetail`).
  - La pestaña no muestra timestamps de predicción.
  - La UI se adapta a mobile (scroll horizontal en la tabla si hay muchos partidos en el día).

---

## Épica 42: Agrupación de `/matches` por día local del usuario (Unit 42 — añadida vía refine)

> Bug fix sobre Units 16, 30 y 41. No reinicia etapas aprobadas.

### US-42.1: Ver cada partido bajo mi día calendario local
**Como** usuario en España u otra zona horaria distinta de UTC
**Quiero** que los bloques de día en `/matches` usen mi fecha local
**Para** encontrar un partido de madrugada bajo el día que realmente veo en mi calendario.
- **Criterios de Aceptación**:
  - Si un partido ocurre a las 01:00 del 18 de junio para el usuario en España, aparece bajo el bloque del 18 de junio en `/matches`.
  - El detalle/tarjeta del partido conserva la hora local que ya se muestra correctamente.
  - El orden de partidos dentro del bloque sigue siendo cronológico por kickoff.
  - "Ver partidos anteriores" usa el mismo día local para decidir qué bloques ocultar.
  - Las predicciones del pool agrupadas por jornada usan el mismo criterio de día local que `/matches`.
  - No cambian reglas de predicción, lock, scoring, sync, admin, rutas ni schema.

---

## Épica 43: Activar web push desde el onboarding y recibir notificaciones tras sync (Unit 43 — añadida vía refine)

> Refine sobre Unit 10 (Web Push), Unit 7 (Admin), Unit 2 (Onboarding). Dos gaps: (1) el usuario no puede activar push durante el onboarding; (2) las notificaciones de partido se encolan pero nunca se despachan. No reinicia etapas aprobadas.

### US-43.1: Activar notificaciones push durante el onboarding

**Como** nuevo jugador en el onboarding
**Quiero** poder activar notificaciones web push como parte del proceso inicial
**Para** no tener que descubrir la opción más tarde en `/settings/profile` y empezar a recibir avisos desde el primer partido.

- **Criterios de Aceptación**:
  - El onboarding incluye un paso "Notificaciones" entre el paso de reglas y el paso de passkey.
  - El paso muestra un prompt para activar web push con el mismo mecanismo del panel de notificaciones existente.
  - El usuario puede omitir el paso sin activar notificaciones (no bloquea el onboarding).
  - Al activar, se solicitan permisos del navegador, se registra el service worker y se guarda la suscripción.
  - Los 5 tipos de notificación (inicio de partido, fin de partido, gol, invitación, ranking) se activan por defecto tras la primera activación desde onboarding.
  - Si el navegador no soporta web push o faltan las VAPID keys, el paso lo indica y solo permite continuar.

### US-43.2: Recibir notificaciones de partido cuando el admin sincroniza

**Como** usuario con predicciones en partidos afectados por una sincronización
**Quiero** recibir notificaciones push cuando el admin sincroniza resultados y se detectan cambios de estado o goles
**Para** enterarme de resultados y goles sin tener la app abierta.

- **Criterios de Aceptación**:
  - Cuando un admin ejecuta "Sincronizar ahora" en `/admin`, los eventos de notificación encolados se despachan automáticamente.
  - Las notificaciones de inicio de partido, fin de partido y gol anotado se envían a los usuarios con predicciones en esos partidos.
  - El dispatch es best-effort: si falla el envío, no impide que la sincronización ni el scoring se completen.
  - Los endpoints de suscripción inválidos se desactivan automáticamente tras fallo 404/410 (comportamiento existente del dispatcher).
  - Sin nuevos tipos de notificación: se trata de enviar las que ya existen (MATCH_STARTED, MATCH_FINISHED, GOAL_SCORED).

---

## Épica 44: Autocompletar nickname al invitar a una liga (Unit 44 — añadida vía refine)

> Refine sobre Unit 3 (Pools), Unit 10 (Directed Invites), Unit 13 (Invitaciones). El formulario de invitación dirigida exige escribir el nickname completo manualmente; se añade autocompletar mientras se escribe. No reinicia etapas aprobadas.

### US-44.1: Buscar y seleccionar un nickname mientras escribo en el campo de invitación

**Como** owner de una liga
**Quiero** que al escribir parte del nickname de un usuario aparezcan sugerencias debajo del campo
**Para** encontrar e invitar rápido a otros jugadores sin tener que recordar ni escribir el discriminator completo.

- **Criterios de Aceptación**:
  - Al escribir al menos 2 caracteres en el campo de invitación, aparece un dropdown con hasta 8 nicknames coincidentes.
  - Cada sugerencia muestra avatar + nickname completo (`base#discriminator`).
  - Al seleccionar una sugerencia, el campo se rellena con el nickname exacto y el dropdown desaparece.
  - Si escribo un email (contiene `@`), el dropdown no aparece y el campo funciona como hasta ahora.
  - La búsqueda es case-insensitive y solo busca por inicio del nickname base (no por discriminator).
  - El botón "Invitar" y el envío del formulario funcionan igual que antes, sin cambios.
  - Si no hay coincidencias o escribo menos de 2 caracteres, no se muestra ningún dropdown.

---

## Épica 45: Permiso configurable de invitación por miembros en pools privados (Unit 45 — añadida vía refine)

> Refine sobre Unit 3 (Pools), Unit 13 (Invitaciones), Unit 44 (Autocompletar). El owner de un pool **privado** decide si los miembros (no-owner) pueden invitar a otros usuarios; el owner siempre puede invitar. El permiso se elige al crear el pool y es editable en un pool en progreso. No reinicia etapas aprobadas.

### US-45.1: Decidir el permiso de invitación al crear un pool privado

**Como** owner de un pool privado recién creado
**Quiero** decidir si los miembros pueden invitar a otros usuarios
**Para** mantener el control sobre quién trae gente a mi liga.

- **Criterios de Aceptación**:
  - Al crear un pool `PRIVATE` desde `/pools/new`, aparece un nuevo control (Switch) "Los miembros pueden invitar", con default `true`.
  - El control solo es visible si el tipo del pool es `PRIVATE`; en `PUBLIC` se oculta (no aplica).
  - Al guardar el pool, el valor del Switch se persiste como `Pool.membersCanInvite`.
  - El default `true` mantiene el comportamiento de Unit 44 (cualquier miembro puede invitar) hasta que el owner decida restringir.
  - Tras crear el pool, el owner es redirigido a `/pools/[id]` y puede cambiar la preferencia en cualquier momento (ver US-45.2).

### US-45.2: Cambiar el permiso de invitación en un pool en progreso

**Como** owner de un pool privado
**Quiero** activar o desactivar el permiso de los miembros para invitar en cualquier momento
**Para** adaptar el control de la liga según la confianza y dinámica del grupo.

- **Criterios de Aceptación**:
  - En `/pools/[id]`, dentro de una sección "Configuración" (visible solo para el owner), hay un Switch "Los miembros pueden invitar" con el valor actual.
  - Al cambiar el Switch, la preferencia se persiste vía `updatePoolMembersCanInvite` y la UI se actualiza sin recargar.
  - Si el owner activa el permiso (`true`): los miembros no-owner ven el `DirectedInviteForm` y pueden usarlo.
  - Si el owner desactiva el permiso (`false`): los miembros no-owner dejan de ver el `DirectedInviteForm` y, si intentan invitar por API, reciben el error "El administrador no permite que los miembros inviten".
  - El owner siempre puede invitar, independientemente del valor del toggle.
  - El cambio aplica inmediatamente (no requiere esperar al próximo partido ni reiniciar la liga).
  - El cambio se puede hacer en cualquier momento del ciclo de vida del pool (no hay congelamiento que lo bloquee).

## Épica 47: Extensión del permiso de invitación a pools públicos (Unit 47 — añadida vía refine)

> Refine sobre Unit 45. El toggle `membersCanInvite` se extiende para que aplique a pools `PUBLIC`, no solo `PRIVATE`. Los miembros de cualquier tipo de pool pueden invitar si el owner lo permite. Sin cambios de schema ni migraciones. No reinicia etapas aprobadas.

### US-47.1: Configurar el permiso de invitación en cualquier tipo de pool

**Como** owner de un pool (público o privado)
**Quiero** decidir si los miembros pueden invitar a otros usuarios, sin importar el tipo de pool
**Para** tener el mismo nivel de control sobre quién invita gente, ya sea en una liga pública o privada.

- **Criterios de Aceptación**:
  - Al crear un pool de cualquier tipo (`PUBLIC` o `PRIVATE`) desde `/pools/new`, el Switch "Los miembros pueden invitar" es visible con default `true`.
  - En `/pools/[id]`, la sección "Configuración" con el toggle `membersCanInvite` se muestra para el owner sin importar si el pool es `PUBLIC` o `PRIVATE`.
  - El owner de un pool público puede desactivar `membersCanInvite` y los miembros no-owner dejarán de ver el `DirectedInviteForm` en ese pool.
  - El gate de invitación es `isOwner || membersCanInvite` (sin restricción por `type`).
  - El `InviteShare` (token/link de invitación) también se oculta cuando `membersCanInvite === false` para un miembro no-owner, en cualquier tipo de pool.
  - Pools existentes (públicos y privados) mantienen `membersCanInvite = true` por el default de la migración de Unit 45, preservando el comportamiento actual hasta que el owner decida cambiarlo.

---

## Épica 48: Predicciones con override por pool (Unit 48 — añadida vía refine, 2026-06-18)

> Refine sobre Units 5 (Predictions), 6 (Scoring), 3 (Pools) y 41 (Pool Predictions). El usuario puede opcionalmente ajustar su predicción para un pool específico. La predicción global sigue siendo el default. El override reemplaza la global solo dentro de ese pool. Sin reiniciar etapas aprobadas.

### US-48.1: Ajustar mi predicción para una liga específica

**Como** miembro de un pool
**Quiero** poder ajustar mi predicción de un partido para ese pool en particular, diferente a mi predicción global
**Para** adaptar mi estrategia según con quién estoy compitiendo en cada liga.

- **Criterios de Aceptación**:
  - Desde la tab "Predicciones" de `/pools/[id]`, el usuario ve sus propias predicciones con posibilidad de editarlas (si el partido está `SCHEDULED` antes de `kickoffAt`).
  - Al guardar desde el pool, se crea una predicción con `poolId = <poolId>`. Si ya existía un override previo, se actualiza (upsert).
  - Si el usuario NO tiene predicción global para ese partido, se muestra un diálogo: "No tienes predicción global para este partido. ¿Guardar este resultado también como tu predicción global?" con dos botones: "Guardar como global también" (crea ambas) y "Solo para esta liga" (cancela con mensaje). **DD-48.2-revised**.
  - Si YA tiene predicción global, guardar desde el pool solo crea/actualiza el override sin diálogo.
  - La predicción global (guardada desde `/matches`) no se modifica al guardar un override desde el pool cuando ya existe global. Si se eligió "Guardar como global también", se crean ambas filas con los mismos scores.
  - Si el usuario no es miembro del pool, el server action rechaza el guardado con error de membresía.
  - Las reglas de lock por `kickoffAt` aplican igual que para predicciones globales: solo se puede editar antes del inicio del partido.
  - La validación de scores (0-20, enteros) y penalty winner (solo knockout empatado) aplica igual que en predicciones globales.

### US-48.2: Ver predicciones de la liga y volver a mi predicción global

**Como** miembro de un pool
**Quiero** ver las predicciones de todos los miembros y, si yo ajusté la mía para esta liga, poder volver a usar mi predicción global como base
**Para** comparar estrategias y decidir si mi ajuste fue acertado.

- **Criterios de Aceptación**:
  - En la tab "Predicciones" de `/pools/[id]`, para cada miembro y partido se muestra:
    - El override del pool si existe.
    - La predicción global si no existe override.
    - Celda vacía ("Sin predicción") si no existe ninguna.
  - Para el usuario actual, si tiene un override activo y además tiene una predicción global para ese partido, se muestra un botón "Usar predicción global" en su celda.
  - Al presionar "Usar predicción global", el override se elimina y la celda muestra la predicción global.
  - Si no existe predicción global, el botón no se muestra (no hay nada a lo que volver).
  - El leaderboard del pool (`/pools/[id]`, tab "Clasificación") calcula los puntos de cada miembro usando el override si existe, o la global si no existe override, sin doble conteo.
  - El leaderboard no distingue visualmente si los puntos vienen de overrides o globales.
  - Las predicciones de otros miembros no son editables (solo lectura).
  - Antes del kickoff, solo el dueño de la predicción ve sus propias predicciones (privacidad pre-partido, BR-5.25). Después del kickoff, son visibles para todos los miembros del pool.

### US-48.3: Ver partidos futuros y navegar entre días

**Como** miembro de un pool
**Quiero** poder ver los partidos del día siguiente y explorar partidos futuros de forma paginada
**Para** ajustar mis predicciones con anticipación sin abrumarme con todos los partidos del torneo de una vez.

- **Criterios de Aceptación**:
  - Al abrir la tab "Predicciones" de `/pools/[id]`, por defecto se muestran los partidos pasados, los de hoy y los del día siguiente (mañana). **FR-REFINE-48.9**.
  - Los partidos futuros más allá de mañana están ocultos inicialmente. Se muestra un botón "Ver más partidos futuros" al final de la lista de días.
  - Al presionar "Ver más partidos futuros", se revelan los siguientes N días de partidos (ej. 5 días), manteniendo visibles los días ya mostrados.
  - El botón "Ver más partidos futuros" se sigue mostrando mientras queden días futuros por revelar.
  - Cuando todos los días futuros están visibles, el botón desaparece (o cambia a estado "Todos los partidos visibles").
  - Si no hay partidos futuros más allá de mañana, el botón no aparece.
  - Las columnas de partidos futuros sin predicciones muestran celdas vacías ("—") para cada miembro.
  - Para el usuario actual (viewer), las celdas de partidos futuros SCHEDULED son editables (modal con PredictionScoreControls).
  - Si el usuario no tiene predicción global para un partido futuro, al editar desde el pool se muestra el diálogo de dual-save (US-48.1).
  - Recargar la página o navegar a otra tab y volver reinicia la paginación (solo pasados + hoy + mañana visibles).

## Épica 50: Sync & Scoring automáticos (Crons) (Unit 50 — añadida vía refine, 2026-06-18)

> Refine que resuelve FR-06 reusando la orquestación de sync (Unit 25/28), scoring (Unit 6) y dispatch (Unit 43). El sync de partidos y el cálculo de puntos pasan de manual (botón en `/admin`) a automático mediante Supabase pg_cron + pg_net contra una ruta autenticada. El sync manual se conserva como fallback. Sin reiniciar etapas aprobadas.

### US-50.1: Que los marcadores y puntos se actualicen solos

**Como** administrador (y, en la práctica, todos los jugadores)
**Quiero** que el estado de los partidos y los puntos se sincronicen automáticamente
**Para** no tener que entrar a `/admin` a pulsar "Sincronizar ahora" cada pocos minutos durante el torneo.

- **Criterios de Aceptación**:
  - Existe una ruta `POST /api/cron/sync?scope=<SCOPE>` protegida por el header `x-sync-secret` (= `SYNC_TRIGGER_SECRET`). Sin secreto correcto responde `401`. **FR-REFINE-50.1**.
  - Scopes válidos: `FIXTURES | LIVE_STATUS | RESULTS | FULL | CLEANUP`. Un scope inválido o ausente responde `400`.
  - Al invocarse con un scope válido, la ruta ejecuta la misma cadena que el admin (sync del proveedor → scoring de partidos finalizados → dispatch de notificaciones) y revalida las vistas de resultados. Un fallo de sync responde `502`.
  - Supabase pg_cron ejecuta los jobs en la cadencia tiered (UTC): `LIVE_STATUS` cada 2 min, `RESULTS` cada 5 min, `FIXTURES` 1/día, `CLEANUP` 1/día. **FR-REFINE-50.3**.
  - La URL base y el secreto se leen de Supabase Vault; no se hardcodean en SQL ni en el repo.
  - Un partido ya finalizado **no** regresa a "en juego" aunque el feed del proveedor sea inconsistente (guard de Unit 46 respetado en el sync automático). **FR-REFINE-50.2**.
  - El sync manual de `/admin` sigue funcionando igual que antes (fallback). Los runs automáticos quedan etiquetados (`cron-…`) y distinguibles de los manuales (`manual-…`) en `/admin`.

### US-50.2: No malgastar la cuota del proveedor cuando no hay partidos

**Como** operador del sistema
**Quiero** que el polling en vivo no consuma cuota de la API cuando no hay partidos en curso
**Para** mantenerme dentro del límite del proveedor (10 req/min) sin desperdiciar llamadas.

- **Criterios de Aceptación**:
  - El job `LIVE_STATUS` (cada 2 min) hace short-circuit cuando no hay ningún partido en vivo o inminente (status LIVE/LOCKED o kickoff dentro de ±3h): responde `{ ok, skipped: true }` sin llamar al proveedor. **FR-REFINE-50.4**.
  - El ahorro de cuota aplica solo al cron automático; el sync manual del admin siempre ejecuta.

## Épica 53: Ocultar predicciones futuras de otros miembros (Unit 53 — añadida vía refine, 2026-06-20)

### US-53.1: No ver las predicciones futuras de otros miembros para no sesgar las mías

**Como** miembro de una liga
**Quiero** ver las predicciones de los demás solo para partidos que ya empezaron o terminaron, no las de partidos futuros
**Para** que no me sesguen al hacer mis propias predicciones.

- **Criterios de Aceptación**:
  - En la pestaña "Predicciones" del pool, la predicción de **otro** miembro para un partido que aún no empieza (`kickoffAt > now`) no es visible: se muestra un candado "Oculta hasta el inicio". **FR-REFINE-53.1**.
  - En cuanto el partido empieza (`kickoffAt <= now`), la predicción de ese miembro se revela (incluye partidos LIVE y FINISHED).
  - **Mis propias** predicciones siempre son visibles, incluidas las de partidos futuros, para poder verlas/editarlas como override de liga.
  - El contenido de las predicciones futuras ajenas no se envía al cliente (enmascarado server-side, no solo visual).
  - Sin cambios en el leaderboard, el ranking global ni `/matches`.

## Épica 56: Grilla de predicciones del pool acotada a la fecha de ingreso (Unit 56 — añadida vía refine, 2026-06-20)

### US-56.1: Ver la grilla del pool coherente con el ranking del pool

**Como** miembro de una liga
**Quiero** que en la grilla de "Predicciones" no aparezcan puntos míos (ni de otros) de partidos previos a haber entrado a la liga
**Para** que lo que veo en la grilla cuadre con el ranking de la liga (Unit 55) y no me confunda con puntos que no cuentan ahí.

- **Criterios de Aceptación**:
  - En la grilla, las celdas de partidos cuyo kickoff es anterior a la fecha de ingreso del miembro se muestran vacías, con un ícono distinto al candado de Unit 53 y el texto "Aún no estaba en la liga". **FR-REFINE-56.1**.
  - Aplica igual para todos los miembros, incluido yo mismo (mis celdas pre-ingreso también salen vacías).
  - Las columnas y los días de esos partidos siguen apareciendo; los miembros que sí estaban en la liga muestran sus predicciones y puntos con normalidad.
  - Los puntos visibles en la grilla coinciden con el total que muestra el leaderboard de la liga.

## Épica 55: Leaderboard del pool acotado a la membresía (Unit 55 — añadida vía refine, 2026-06-20)

### US-55.1: Ver el ranking de mi liga con los puntos acumulados en la liga

**Como** miembro de una liga
**Quiero** que el ranking de la liga muestre solo los puntos que acumulé dentro de esa liga
**Para** que la liga sea una competencia propia y no un reflejo del ranking global, sobre todo cuando me uno con el torneo ya empezado.

- **Criterios de Aceptación**:
  - El leaderboard de la liga (`/pools/[id]`) suma, por miembro, solo los partidos jugados **después** de que ese miembro se unió a la liga (`kickoff ≥ fecha de ingreso`). **FR-REFINE-55.1**.
  - Para esos partidos, se usa la predicción del miembro: su ajuste de la liga (override) si lo hizo, si no su predicción global heredada; sin doble conteo.
  - Un miembro que se unió hace poco y aún no tiene partidos jugados tras su ingreso aparece con 0 puntos (no hereda su histórico previo).
  - El leaderboard global (`/rankings`) no cambia: sigue siendo la suma de las predicciones globales del usuario.

## Épica 54: Renombrar pool con confirmación (Unit 54 — añadida vía refine, 2026-06-20)

### US-54.1: Cambiar el nombre de mi liga con una confirmación

**Como** administrador de una liga
**Quiero** cambiar el nombre de mi liga y que me pida confirmar antes de aplicarlo
**Para** corregir o actualizar el nombre sin tener que recrear la liga, evitando cambios accidentales.

- **Criterios de Aceptación**:
  - Desde el panel de Configuración en `/pools/[id]` (visible solo para el dueño), puedo editar el nombre y pulsar "Cambiar nombre". **FR-REFINE-54.1**.
  - Al guardar se abre un diálogo de confirmación que muestra `«nombre actual» → «nombre nuevo»` con botones Cancelar / Confirmar; el cambio solo se aplica al Confirmar. **FR-REFINE-54.2**.
  - El nombre se valida: trim, mínimo 3 y máximo 60 caracteres; si no cumple, se muestra el error y no se persiste.
  - Funciona tanto en ligas públicas como privadas. **FR-REFINE-54.3**.
  - Solo el dueño puede renombrar; un no-dueño no ve el panel y, si invoca la acción, recibe "Solo el administrador puede cambiar esta configuración" (validación server-side).
  - Tras confirmar, el nuevo nombre aparece en el detalle `/pools/[id]` y en la lista `/pools`.

## Épica 58: Resultados en vivo vía Supabase Realtime — websockets (Unit 58 — añadida vía refine, 2026-06-20)

### US-58.1: Ver el marcador actualizarse solo en `/matches`

**Como** aficionado siguiendo el torneo
**Quiero** que el marcador y el estado de los partidos en `/matches` se actualicen en vivo
**Para** seguir los resultados sin tener que recargar la página manualmente.

- **Criterios de Aceptación**:
  - Con un partido en juego, cuando llega un resultado nuevo del servidor, el marcador y el badge LIVE se actualizan solos en ~1–2 s sin recargar. **FR-REFINE-58.1**, **FR-REFINE-58.3**.
  - La actualización viaja por WebSocket (Supabase Realtime); si Realtime no está disponible, la página sigue funcionando como antes (refresco manual). **FR-REFINE-58.3**.

### US-58.2: Ver el marcador en vivo y los puntos en la grilla del pool

**Como** miembro de una liga
**Quiero** que la pestaña "Predicciones" de mi liga muestre el marcador en vivo y actualice los puntos sin recargar
**Para** seguir cómo va el partido y cómo se reparten los puntos en tiempo real.

- **Criterios de Aceptación**:
  - La cabecera de cada columna de partido en juego muestra el marcador en vivo + badge LIVE; los puntos por miembro se actualizan solos al cambiar el resultado. **FR-REFINE-58.2**.
  - La grilla se refresca sin recarga manual cuando llega una actualización del servidor. **FR-REFINE-58.1**, **FR-REFINE-58.3**.
  - El enmascarado anti-sesgo de predicciones futuras (Unit 53) y el vaciado pre-ingreso (Unit 56) se mantienen tras el refresco en vivo.

## Épica 59: El último partido del día sigue visible hasta 1h antes del siguiente (Unit 59 — añadida vía refine, 2026-06-20)

### US-59.1: Seguir viendo el último partido durante el hueco hasta el siguiente

**Como** usuario que sigue el torneo en `/matches`
**Quiero** que el último partido del día se mantenga visible tras la medianoche hasta poco antes del siguiente partido
**Para** consultar el resultado más fresco sin tener que abrir "Ver partidos anteriores".

- **Criterios de Aceptación**:
  - El último partido de ayer fue a las 21:00 y el siguiente es pasado mañana a las 18:00: ese partido sigue visible en la vista principal hasta las 17:00 de pasado mañana (1h antes); luego desaparece. **FR-REFINE-59.1**.
  - Si el último horario tiene varios partidos (p. ej. dos a las 21:00), todos permanecen visibles juntos; los partidos más tempranos de ese día no. **FR-REFINE-59.1**, **FR-REFINE-59.2**.
  - Aparece bajo el encabezado de su propio día, arriba de los bloques futuros, y no se duplica al abrir "Ver partidos anteriores". **FR-REFINE-59.2**.
  - Si el siguiente partido no tiene fecha confirmada (TBD) o no hay más partidos, el último horario permanece visible hasta que aparezca una fecha. **FR-REFINE-59.3**.

## Épica 60: Partidos duplicados (27/28 jun) eliminados + bandera de Uruguay corregida (Unit 60 — añadida vía refine, 2026-06-22)

### US-60.1: Ver la bandera de Uruguay

**Como** usuario que mira partidos en `/matches` y `/pools`
**Quiero** ver la bandera de Uruguay correctamente
**Para** identificar al equipo de un vistazo.

- **Criterios de Aceptación**:
  - Uruguay muestra `/flags/uy.svg`, no una imagen rota. **FR-REFINE-60.1**.
  - Existe una sola fila de equipo Uruguay (`URY`). **FR-REFINE-60.1**.

### US-60.2: Ver cada partido una sola vez

**Como** usuario que predice en `/matches`
**Quiero** ver cada partido del 27/28 jun una sola vez
**Para** no confundirme con duplicados ni dividir mis predicciones.

- **Criterios de Aceptación**:
  - Cada fixture del 27/28 jun aparece una sola vez; se eliminó el duplicado con menos predicciones y sus predicciones enlazadas. **FR-REFINE-60.2**, **FR-REFINE-60.3**.
  - El partido que queda conserva su número ("Partido N") y, en el knockout, su etiqueta de placeholder. **FR-REFINE-60.4**.

## Épica 61: Banner «En vivo ahora» en el pool (Unit 61 — añadida vía refine, 2026-06-23)

### US-61.1: Ver qué partido(s) está(n) en juego en mi liga desde cualquier pestaña

**Como** miembro de una liga
**Quiero** ver el/los partido(s) que está(n) ocurriendo ahora en mi liga —con el marcador en vivo y la predicción de cada miembro— sin tener que entrar a la pestaña Predicciones ni navegar al día correcto
**Para** seguir de un vistazo qué está pasando hoy en mi liga, esté en la pestaña que esté.

- **Criterios de Aceptación**:
  - Cuando hay al menos un partido `LIVE` entre los partidos del pool, aparece un banner «En vivo ahora» arriba de las pestañas, visible desde Clasificación, Predicciones y Miembros. **FR-REFINE-61.1**.
  - El banner no aparece (sin hueco) cuando no hay partidos en juego. **FR-REFINE-61.1**.
  - Cada partido del banner muestra equipos, banderas, marcador en vivo y badge LIVE. **FR-REFINE-61.1**.
  - Debajo de cada partido, una lista compacta por miembro muestra su predicción (la ajustada del pool si existe, si no la global) y sus puntos actuales ("—" mientras no se haya puntuado). **FR-REFINE-61.2**.
  - Un miembro que se unió al pool después del kickoff del partido en vivo muestra "Aún no estaba en la liga" con ícono `CalendarOff` (no se inventan puntos heredados). **FR-REFINE-61.2**, **BR-56.1**.
  - Un CTA «Ver en Predicciones» por partido lleva a la pestaña Predicciones, posicionada en la página/día de ese partido. La pestaña activa se refleja en la URL (`?tab=…`). **FR-REFINE-61.3**.
  - El marcador y los puntos del banner se actualizan solos vía Realtime (Unit 58) sin recarga manual; si Realtime no está disponible, todo sigue funcionando con refresco manual. **FR-REFINE-61.4**.
