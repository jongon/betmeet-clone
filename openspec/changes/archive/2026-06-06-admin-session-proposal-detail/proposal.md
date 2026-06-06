## Why

Hoy el admin puede aceptar o rechazar una sesion desde la lista de `/admin`, pero no tiene una vista dedicada para revisar la propuesta completa antes de decidir. Eso obliga a tomar decisiones con poco contexto y deja sin una surface clara para auditar sesiones cerradas o archivadas en modo solo lectura.

## What Changes

- Crear una ruta protegida de detalle de sesion en admin para revisar la propuesta completa antes de aprobar o rechazarla.
- Mostrar en esa vista el balance, lo que recibe cada parte y el detalle por bloque de la propuesta, incluyendo reglas aceptadas, contraofertas, cromos exactos y notas.
- Mantener las acciones rapidas de aprobar y rechazar en la lista de `/admin`, agregando tambien una accion `Ver detalle` en cada fila.
- Permitir abrir la misma vista de detalle para sesiones cerradas o archivadas en modo solo lectura, sin acciones de decision.
- Mantener CTA sticky en mobile dentro del detalle cuando la sesion siga abierta y tenga propuesta pendiente.

## Capabilities

### New Capabilities
- `admin-sesion-propuesta-detalle`: vista detallada de una sesion de cambio para revisar la propuesta completa en admin, con modo editable para pendientes y modo solo lectura para cerradas o archivadas.

### Modified Capabilities
- `admin-sesiones`: el inbox principal de `/admin` agrega acceso a `Ver detalle` por fila sin quitar las acciones rapidas de aprobar y rechazar.
- `admin-sesiones-archivadas`: la lista de archivadas agrega acceso al mismo detalle en modo solo lectura.

## Impact

- Rutas admin en App Router: nueva surface tipo `/admin/sesiones/[id]` y enlaces desde listas existentes.
- Componentes de sesiones admin: filas, acciones y posibles estados de solo lectura/pendiente.
- Repositorio de sesiones: lectura de una sesion individual y manejo de ausencia de propuesta.
- Presentacion de propuestas persistidas: reuso del modelo `proposal`, `blocks`, `requestedRepeateds`, notas y conteos actuales.
- Specs OpenSpec afectadas: `admin-sesion-propuesta-detalle`, `admin-sesiones`, `admin-sesiones-archivadas`.
