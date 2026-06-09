# Plan de Generación de Historias de Usuario

## Personas Identificadas

1. **Usuario No Verificado**: Se registró en la plataforma pero no ha verificado su email. Tiene acceso limitado, puede navegar la plataforma pero no participar en quinielas ni pools.
2. **Usuario Verificado**: Email verificado. Es el usuario principal ("Jugador"). Puede crear/unirse a pools, hacer predicciones, ver rankings y configurar su cuenta.
3. **Administrador**: Gestión del sistema, configuración del Mundial, validación de resultados (o supervisión del API) y moderación.

## Épicas e Historias Propuestas

### Épica 1: Autenticación y Perfil (Base transversal)
- **US-1.1**: Registro y login con email/password y verificación obligatoria
- **US-1.2**: Autenticación con Google OAuth (Auto-verificado por defecto)
- **US-1.3**: Inicio de sesión opcional con Passkey (WebAuthn)
- **US-1.4**: Account Linking (fusión de cuentas por email)
- **US-1.5**: Configuración de seguridad y MFA opcional
- **US-1.6**: Configuración de Avatar (Foto de Google, selección de set predefinido, o subida de foto personalizada)
- **US-1.7**: Generación y gestión de Nickname único (Estilo Discord clásico con sufijo numérico discriminador si se repite)

### Épica 2: La Competición (Mundial 2026)
- **US-2.1**: Visualización del fixture (calendario de partidos) por fases
- **US-2.2**: Visualización de detalles y estado de un partido (En espera, En juego, Finalizado)
- **US-2.3**: Integración de resultados en vivo (automatización API)
- **US-2.4**: Desbloqueo de llaves de eliminación directa según resultados

### Épica 3: Quinielas y Predicciones (Core del negocio)
- **US-3.1**: Predecir marcador de un partido antes de que inicie
- **US-3.2**: Modificar predicción existente antes del inicio del partido
- **US-3.3**: Predecir empate y opcionalmente elegir ganador por penales (solo fases knockout)
- **US-3.4**: Visualización de mis predicciones pasadas y futuras (inmutabilidad post-kickoff)

### Épica 4: Pools (Grupos sociales)
- **US-4.1**: Creación de un Pool (Público o Privado) y ajuste del límite de participantes (max 100)
- **US-4.2**: Unirse a un Pool público o privado (mediante link o código)
- **US-4.3**: Salir de un Pool
- **US-4.4**: Expulsar miembros del Pool (solo Admin del pool, solo antes del primer partido)

### Épica 5: Puntuación y Rankings
- **US-5.1**: Cálculo automático de puntos por partido (5 pts exacto, 2 pts ganador/empate, 1 pt marcador parcial, +1 pt penales)
- **US-5.2**: Visualización de mi puntuación acumulada
- **US-5.3**: Visualización del Ranking (Leaderboard) dentro de un Pool
- **US-5.4**: Gestión de empates en el ranking (compartir posición como ganadores)

### Épica 6: Panel de Administración
- **US-6.1**: Supervisión de la sincronización de la API de fútbol
- **US-6.2**: Forzar actualización manual de un resultado o partido
- **US-6.3**: Visualización de métricas generales (usuarios, pools activos)

---

## Criterios de Aceptación y Diseño para v2
- Todas las historias de la Épica 3 (Predicciones) y 5 (Puntuación) serán redactadas asegurando que los datos sean inmutables tras el cierre del partido, preparando la arquitectura para la futura monetización con USDT/Solana.