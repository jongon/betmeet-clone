## Why

Hoy el QR del admin apunta a `/cambio/{token}`, pero no existe una experiencia definida para el cambiador al entrar. Necesitamos una entrada clara y determinística que reduzca fricción: reanudar automáticamente una sesión previa o crear una nueva en un paso con nombre.

## What Changes

- Definir la pantalla pública de entrada en `/cambio/[token]` para usuarios cambiadores sin autenticación.
- Implementar resolución automática al cargar la ruta: reanudar sesión abierta existente del cambiador o mostrar formulario de creación.
- Crear formulario de nombre con envío por Enter y botón Aceptar.
- Persistir identidad del cambiador con cookie `httpOnly` para reidentificación y reanudación.
- Definir manejo explícito cuando existe sesión previa cerrada para el mismo token: mostrar error y no continuar.
- Definir estados de error para token inválido, token revocado/inexistente y errores transitorios de servidor.

## Capabilities

### New Capabilities
- `cambiador-cambio`: Flujo público de entrada por QR en `/cambio/[token]`, auto-resolución de sesión (reanudar o crear), creación por nombre y manejo de errores.

### Modified Capabilities
- `admin-qr`: Aclarar explícitamente que el destino del QR `/cambio/{token}` resuelve sesión del cambiador al entrar (reanudar sesión abierta o crear mediante formulario), incluyendo el caso de sesión previa cerrada.

## Impact

- Frontend App Router público: nueva ruta dinámica `src/app/cambio/[token]/page.tsx` y componentes de formulario/estados.
- Server Actions/servicios de sesión: lookup por `token + identidadCambiador`, creación de sesión y reglas de rechazo si ya existe una cerrada.
- Capa de persistencia de sesiones: soporte para asociación con identidad estable del cambiador.
- Cookies: incorporación de cookie `httpOnly` para identidad del cambiador en flujo público.
- Specs OpenSpec afectadas: nueva capability `cambiador-cambio` y delta sobre `admin-qr`.
