## Why

Hoy aceptar una sesion desde `/admin` o desde `/admin/sesiones/[id]` solo cambia el estado de la sesion a `closed`. El sistema no aplica el intercambio aceptado sobre los inventarios del coleccionista: los cromos recibidos no se desmarcan como faltantes y los repetidos entregados al cambiador no se descuentan.

Ademas, cuando la propuesta pendiente ya no coincide con el inventario actual, el comportamiento esperado ya no es "aceptar igual", sino cerrar esa sesion como decision rechazada por inconsistencia para evitar dobles descuentos o intercambios imposibles.

## What Changes

- Hacer que aceptar una sesion pendiente consuma la propuesta sobre inventarios antes de cerrarla.
- Desmarcar como faltantes los cromos que recibe el coleccionista al aceptar una propuesta valida.
- Descontar del inventario de repetidos los cromos que recibe el cambiador al aceptar una propuesta valida.
- Si al intentar aceptar la propuesta ya no coincide con faltantes o repetidos actuales, cerrar la sesion sin aplicar cambios de inventario.
- Mantener la operacion idempotente para sesiones ya cerradas y evitar dobles descuentos.

## Capabilities

### Modified Capabilities
- `admin-sesiones`: aceptar una sesion deja de ser solo un cambio de estado y pasa a resolver la propuesta pendiente contra inventarios actuales.
- `admin-cromos-faltantes`: las aprobaciones validas pueden completar faltantes automaticamente desde una sesion aceptada.
- `admin-cromos-repetidos`: las aprobaciones validas pueden descontar cantidades desde una sesion aceptada.

## Impact

- Server actions y dominio de sesiones admin.
- Hooks reutilizables de faltantes y nuevo consumo de repetidos.
- Validaciones previas a la aprobacion para propuestas pendientes con inventario desfasado.
- Tests de aceptacion e idempotencia.
