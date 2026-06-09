# Personas del Sistema

## 1. Usuario No Verificado (El Visitante Pendiente)
- **Descripción**: Un usuario que ha creado una cuenta utilizando Email/Password pero aún no ha hecho clic en el enlace de verificación enviado a su correo. (Nota: Los usuarios que ingresan vía Google OAuth se consideran "Verificados" automáticamente).
- **Objetivos**: Explorar la plataforma para ver si le interesa completar su registro.
- **Puntos de dolor**: Fricción en el registro, correos de verificación que caen en spam.
- **Permisos en el sistema**: 
  - Puede navegar por el fixture del Mundial.
  - Puede ver los rankings de pools públicos.
  - NO puede unirse a pools.
  - NO puede realizar predicciones.

## 2. Usuario Verificado (El Jugador / Entusiasta del Fútbol)
- **Descripción**: El core user de la aplicación. Un aficionado al fútbol que quiere competir con sus amigos o con la comunidad global prediciendo los resultados del Mundial 2026. Tiene un email verificado (o ingresó con Google) y un Nickname único asignado.
- **Objetivos**:
  - Acumular la mayor cantidad de puntos posibles.
  - Ganarle a sus amigos en pools privados.
  - Ver su progreso en tiempo real durante los partidos.
- **Puntos de dolor**: Olvidarse de predecir antes de un partido, interfaces complejas, resultados que tardan en actualizarse.
- **Permisos en el sistema**:
  - Creación y gestión completa de su perfil (avatar, nickname).
  - Participación en múltiples pools (públicos y privados).
  - Realización y modificación de predicciones hasta el pitazo inicial.
  - Si crea un pool privado, actúa como **Admin de Pool**, pudiendo expulsar miembros antes del primer partido.

## 3. Administrador Global (El Moderador)
- **Descripción**: Parte del equipo de operaciones de la aplicación. Mantiene el sistema funcionando y supervisa la correcta integración de datos.
- **Objetivos**: Asegurar que los partidos, resultados y puntos se calculen de manera exacta y oportuna.
- **Puntos de dolor**: APIs de terceros (API-Football) que fallan o devuelven datos inconsistentes, usuarios reportando fallos en la puntuación.
- **Permisos en el sistema**:
  - Acceso al panel de administración.
  - Forzar sincronización de la API o modificar manualmente el resultado de un partido si la API falla.
  - Supervisión general del sistema y moderación de usuarios/pools.