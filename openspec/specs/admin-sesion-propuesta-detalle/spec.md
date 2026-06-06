# admin-sesion-propuesta-detalle Specification

## Purpose
Definir la ruta protegida de detalle de una propuesta de sesión de cambio en admin, incluyendo modo solo lectura para sesiones cerradas o archivadas.

## Requirements
### Requirement: Ruta de detalle de propuesta de sesión en admin
El sistema SHALL exponer una ruta protegida `/admin/sesiones/[id]` para revisar el detalle completo de una sesión de cambio. La pantalla SHALL mostrar el nombre del cambiador, estado, fecha de creación, balance global, lo que recibe el coleccionista, lo que recibe el cambiador y el detalle por bloque de la propuesta.

#### Scenario: Admin abre una sesión pendiente con propuesta
- **WHEN** el admin autenticado navega a `/admin/sesiones/ses_01` y la sesión tiene una propuesta pendiente
- **THEN** la página muestra el detalle completo de la propuesta antes de aprobar o rechazar

#### Scenario: Admin abre una sesión sin propuesta
- **WHEN** el admin navega a `/admin/sesiones/ses_02` y esa sesión no tiene `proposal`
- **THEN** la página muestra un estado vacío claro y ofrece volver a la lista de sesiones

### Requirement: Detalle reutilizable en modo solo lectura
La ruta `/admin/sesiones/[id]` SHALL reutilizar la misma estructura visual para sesiones abiertas, cerradas o archivadas. Cuando la sesión esté cerrada o archivada, la pantalla SHALL entrar en modo solo lectura y SHALL ocultar las acciones de aprobar o rechazar.

#### Scenario: Admin abre una sesión cerrada
- **WHEN** el admin navega al detalle de una sesión con `status: "closed"` y `archivedAt: null`
- **THEN** la página muestra el detalle de la propuesta en modo solo lectura

#### Scenario: Admin abre una sesión archivada
- **WHEN** el admin navega al detalle de una sesión con `archivedAt` no nulo
- **THEN** la página muestra el detalle de la propuesta en modo solo lectura y mantiene visible que pertenece al historial archivado

### Requirement: CTA sticky en mobile para sesiones abiertas
Cuando la sesión esté abierta y tenga propuesta pendiente, la ruta de detalle SHALL mostrar en mobile una barra sticky inferior con acciones para `Rechazar` y `Aprobar propuesta`. Esa barra SHALL no mostrarse en sesiones cerradas o archivadas.

#### Scenario: Sticky CTA en propuesta pendiente
- **WHEN** el admin abre en mobile una sesión abierta con propuesta pendiente
- **THEN** la interfaz mantiene visibles las acciones de aprobar y rechazar en una banda sticky inferior mientras hace scroll

#### Scenario: Sin sticky CTA en solo lectura
- **WHEN** el admin abre en mobile una sesión cerrada o archivada
- **THEN** la interfaz no muestra banda sticky de acciones de decisión
