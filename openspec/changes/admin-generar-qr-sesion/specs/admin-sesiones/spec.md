## ADDED Requirements

### Requirement: El modelo de sesión incluye el token de origen
El sistema SHALL incluir en el schema de `Session` (en `src/lib/sessions.ts`) un campo `token: z.string().min(1)` que referencia el token del QR con el que el cambiador creó la sesi\u00f3n. Una sesi\u00f3n sin token SHALL seguir siendo válida (compatibilidad con datos legacy), pero los componentes que dependen del token SHALL comprobar su presencia antes de renderizar.

#### Scenario: SessionSchema acepta el nuevo campo
- **WHEN** se parsea un objeto sesi\u00f3n que incluye `token: "qr_abc123"`
- **THEN** `SessionSchema.parse(...)` retorna el objeto validado sin error

#### Scenario: SessionSchema rechaza token vacío
- **WHEN** se parsea un objeto sesi\u00f3n con `token: ""`
- **THEN** `SessionSchema.parse(...)` lanza un error de validación Zod

### Requirement: Fila de sesi\u00f3n abierta con token muestra botón "Ver QR"
El sistema SHALL renderizar en cada fila de `/admin` correspondiente a una sesi\u00f3n con `status: "open"` y `token` no vacío, un tercer botón con icono de ojo (lucide-react `Eye`) y `aria-label="Ver QR de {cambiadorName}"`. Al hacer clic, SHALL abrir el `QrDialog` definido en la spec `admin-qr` mostrando el QR original (mismo token, misma URL) usado para crear esa sesi\u00f3n. El botón "Ver QR" SHALL NO aparecer en filas con `status: "closed"` ni en filas sin token.

#### Scenario: Fila abierta con token muestra "Ver QR"
- **WHEN** la lista incluye una sesi\u00f3n con `status: "open"` y `token` no vacío
- **THEN** la fila renderiza los tres botones (✓, ✗, Ver QR) en el grupo de acciones

#### Scenario: Fila cerrada no muestra "Ver QR"
- **WHEN** la lista incluye una sesi\u00f3n con `status: "closed"`
- **THEN** la fila solo muestra el badge "Cerrada" y no muestra ✓, ✗, ni "Ver QR"

#### Scenario: Fila abierta sin token no muestra "Ver QR"
- **WHEN** la lista incluye una sesi\u00f3n con `status: "open"` pero `token` vacío o ausente
- **THEN** la fila renderiza ✓ y ✗ pero NO "Ver QR" (compatibilidad con datos legacy)
