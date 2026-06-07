## MODIFIED Requirements

### Requirement: Creación de sesión desde formulario de nombre
Si no existe sesión previa abierta, el sistema SHALL mostrar un formulario con campo `nombre` y acción principal `Aceptar`. El formulario SHALL permitir envío por tecla Enter y por click en el botón Aceptar. Al enviar un nombre válido, el sistema SHALL primero verificar si existe una sesión admin activa; si existe, SHALL cerrarla mediante `supabase.auth.signOut()`. Luego SHALL crear una sesión abierta asociada al token y entrar inmediatamente a la sesión creada.

#### Scenario: Creación con Enter
- **WHEN** el cambiador escribe un nombre válido y presiona Enter
- **THEN** el sistema crea la sesión abierta y entra a la sesión creada

#### Scenario: Creación con botón Aceptar
- **WHEN** el cambiador escribe un nombre válido y hace click en Aceptar
- **THEN** el sistema crea la sesión abierta y entra a la sesión creada

#### Scenario: Creación con sesión admin activa
- **WHEN** el cambiador envía un nombre válido y existe una sesión admin activa en el navegador
- **THEN** el sistema cierra la sesión admin, crea la sesión de cambiador, y entra a la sesión creada
