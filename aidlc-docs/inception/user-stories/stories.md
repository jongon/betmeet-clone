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

### US-4.3: Expulsar Miembros (Admin de Pool)
**Como** admin de un pool
**Quiero** poder eliminar a un participante indeseado
**Para** mantener el control de mi grupo privado.
- **Criterios de Aceptación**:
  - Solo el admin del pool puede hacerlo.
  - Solo se puede expulsar a alguien ANTES de que comience el primer partido del Mundial. Una vez rodando el balón de inauguración, las listas se congelan.

---

## Épica 5: Puntuación y Rankings

### US-5.1: Cálculo de Puntos
**Como** sistema
**Quiero** calcular los puntos de todos los usuarios cuando finaliza un partido
**Para** actualizar los rankings.
- **Criterios de Aceptación (Lógica Core)**:
  - Acertar marcador exacto = 5 puntos.
  - Acertar resultado (ganador/empate) sin marcador exacto = 2 puntos.
  - Acertar solo la cantidad de goles de uno de los equipos (y fallar el resultado) = 1 punto.
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

### US-6.1: Sincronización API-Football
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