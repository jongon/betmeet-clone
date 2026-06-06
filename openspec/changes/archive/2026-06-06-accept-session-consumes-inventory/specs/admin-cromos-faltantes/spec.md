## MODIFIED Requirements

### Requirement: Hook de marcado como completado con lista completa
El sistema SHALL exponer la función `markStickersAsCompletedForAdmin(ownerEmail, stickerCodes[])` para que una aceptación válida de sesión pueda eliminar del inventario los cromos recibidos por el coleccionista. La función SHALL operar en una sola llamada con la lista completa, SHALL ser idempotente y SHALL actualizar `updatedAt` solo si hay cambios efectivos.

#### Scenario: Aceptación válida completa varios faltantes
- **WHEN** una operación futura de aceptación de sesión invoca `markStickersAsCompletedForAdmin` con todos los `requestedStickerCode` de una propuesta vigente
- **THEN** el sistema elimina esos cromos del inventario en una sola operación y actualiza `updatedAt`

### Requirement: Rechazo automático de propuestas con cromo no faltante
El sistema SHALL permitir a la operación de aprobación de propuestas invocar la validación de faltantes en el momento del envío y de la aceptación. Si un cromo solicitado ya no es faltante al momento de aceptar, la aceptación SHALL rechazarse, la sesión SHALL cerrarse, y el inventario SHALL permanecer intacto.

#### Scenario: Propuesta pendiente que pierde un cromo antes de aceptarse
- **WHEN** una propuesta pendiente incluye un cromo y el admin lo marca como completado o lo quita de faltantes antes de aprobarla
- **THEN** la operación de aceptación detecta el cambio, rechaza la aceptación, cierra la sesión y no modifica inventarios
