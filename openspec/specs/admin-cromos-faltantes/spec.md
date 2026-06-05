## Purpose

Gestion del inventario de cromos faltantes del admin en `/admin/cromos/faltantes`, incluyendo vista de album completo, persistencia sparse por propietario, contratos reutilizables para validar faltantes y hooks para completar cromos o rechazar propuestas desfasadas.

## Requirements

### Requirement: Ruta /admin/cromos/faltantes con vista de album completo
El sistema SHALL exponer la ruta protegida `/admin/cromos/faltantes` como panel de gestion de cromos faltantes del admin autenticado. La vista SHALL mostrar los 980 cromos del album 2026 agrupados por seleccion y numeracion. Los grupos SHALL renderizarse con `FWC` primero y luego con las selecciones en el orden oficial del album 2026. Dentro de cada grupo, los cromos faltantes SHALL aparecer primero y los no faltantes despues.

#### Scenario: Admin autenticado accede a la ruta
- **WHEN** el admin autenticado navega a `/admin/cromos/faltantes`
- **THEN** la pagina renderiza la vista de album completo con los grupos en el orden del catalogo y los faltantes al inicio de cada grupo

#### Scenario: Orden oficial de grupos
- **WHEN** el admin abre la vista completa de faltantes
- **THEN** la pantalla muestra `FWC` primero y luego las selecciones segun el orden oficial del álbum

#### Scenario: Grupo con cromos faltantes y no faltantes
- **WHEN** el admin abre un grupo donde algunos cromos estan marcados como faltantes
- **THEN** esos cromos se renderizan antes que los no faltantes dentro del mismo grupo

### Requirement: Validacion contra el catalogo del album 2026
El sistema SHALL validar en servidor que cada `stickerCode` marcado como faltante pertenezca al catalogo del album 2026 antes de persistir.

#### Scenario: Codigo valido del catalogo
- **WHEN** el admin marca como faltante un codigo que pertenece al catalogo
- **THEN** el sistema acepta el cambio y lo persiste

#### Scenario: Codigo fuera del catalogo
- **WHEN** el admin intenta marcar como faltante un codigo que no pertenece al catalogo
- **THEN** el sistema rechaza el cambio y muestra error de validacion

### Requirement: Marcado y desmarcado individual
El sistema SHALL permitir al admin marcar y desmarcar un cromo individual como faltante desde su card. La accion SHALL persistir de inmediato, SHALL actualizar `updatedAt` del documento y SHALL revalidar `/admin/cromos/faltantes`.

#### Scenario: Marcar un cromo como faltante
- **WHEN** el admin activa el toggle `Faltante` en la card de un cromo
- **THEN** el sistema persiste la entrada y actualiza `updatedAt`

#### Scenario: Desmarcar un cromo
- **WHEN** el admin desactiva el toggle `Faltante` en la card de un cromo
- **THEN** el sistema elimina la entrada sparse y actualiza `updatedAt`

### Requirement: Marcado masivo desde la vista de album completo
El sistema SHALL permitir seleccionar multiples cromos y aplicar `Marcar como faltante` o `Desmarcar` en una sola accion. La accion SHALL pedir confirmacion previa y SHALL validar pertenencia al catalogo para cada codigo.

#### Scenario: Marcar varios cromos
- **WHEN** el admin selecciona varios cromos y confirma `Marcar como faltante`
- **THEN** el sistema persiste todas las entradas validas y muestra el resumen del cambio

#### Scenario: Codigo invalido en seleccion masiva
- **WHEN** el admin confirma una accion masiva que incluye un codigo fuera del catalogo
- **THEN** el sistema rechaza toda la operacion y muestra el detalle de los codigos invalidos

### Requirement: Persistencia sparse de faltantes por admin
El sistema SHALL persistir el inventario de faltantes en un repositorio JSON swappable por `ownerEmail`, con auto-seed en disco desde un documento vacio. El inventario SHALL almacenarse como record sparse de `stickerCode -> true` y SHALL normalizarse eliminando entradas con valor `false`. La lectura SHALL validarse con Zod.

#### Scenario: Persistencia sparse
- **WHEN** el admin guarda cambios donde varios cromos quedan desmarcados
- **THEN** el repositorio persiste solo los codigos marcados como faltantes

#### Scenario: Documento auto-seed en disco
- **WHEN** un admin abre la ruta por primera vez y no existe documento persistido
- **THEN** el sistema crea un documento vacio en disco para ese admin sin error

### Requirement: Vaciar inventario de faltantes con confirmacion
El sistema SHALL exponer una accion `Vaciar inventario de faltantes` que elimina todas las entradas del documento del admin. La accion SHALL pedir confirmacion explicita antes de ejecutarse y SHALL actualizar `updatedAt`.

#### Scenario: Vaciar inventario confirmado
- **WHEN** el admin confirma la accion `Vaciar inventario de faltantes`
- **THEN** el sistema elimina todas las entradas del documento, deja el inventario vacio y actualiza `updatedAt`

#### Scenario: Cancelar vaciado
- **WHEN** el admin cancela la confirmacion de `Vaciar inventario de faltantes`
- **THEN** el sistema no modifica el documento y conserva el estado previo

### Requirement: Re-marcar como faltante un cromo completado
El sistema SHALL permitir al admin volver a marcar como faltante cualquier cromo, incluso si fue completado previamente por una propuesta aprobada o por el atajo manual. El sistema SHALL no distinguir entre origenes en la persistencia.

#### Scenario: Re-marcar un cromo completado
- **WHEN** el admin marca como faltante un cromo que fue completado con `markStickersAsCompletedForAdmin`
- **THEN** el sistema lo persiste como faltante sin error

#### Scenario: Estado final consistente
- **WHEN** el admin consulta el inventario de faltantes tras re-marcar
- **THEN** el cromo aparece como faltante actual

### Requirement: Contrato publico isStickerMissingForAdmin
El sistema SHALL exponer la funcion `isStickerMissingForAdmin(ownerEmail, stickerCode)` que devuelve `true` unicamente si el cromo esta marcado como faltante para ese admin. La funcion SHALL consultar el store en cada invocacion, SHALL importar el catalogo para validar pertenencia y SHALL ser importada directamente por la spec de overrides exactos y por el flujo publico.

#### Scenario: Cromo faltante
- **WHEN** el sistema consulta `isStickerMissingForAdmin` para un cromo marcado como faltante
- **THEN** la funcion devuelve `true`

#### Scenario: Cromo no faltante
- **WHEN** el sistema consulta `isStickerMissingForAdmin` para un cromo no marcado como faltante
- **THEN** la funcion devuelve `false`

#### Scenario: Codigo fuera del catalogo
- **WHEN** el sistema consulta `isStickerMissingForAdmin` para un codigo que no pertenece al catalogo
- **THEN** la funcion devuelve `false`

### Requirement: Hook de marcado como completado con lista completa
El sistema SHALL exponer la funcion `markStickersAsCompletedForAdmin(ownerEmail, stickerCodes[])` que elimina del inventario los cromos indicados. La funcion SHALL operar en una sola llamada con la lista completa, SHALL ser idempotente y SHALL actualizar `updatedAt` solo si hay cambios efectivos.

#### Scenario: Marcar varios como completados
- **WHEN** la spec futura invoca `markStickersAsCompletedForAdmin` con una lista de cromos faltantes
- **THEN** el sistema elimina esos cromos del inventario en una sola operacion y actualiza `updatedAt`

#### Scenario: Lista con cromo no faltante
- **WHEN** la spec futura invoca `markStickersAsCompletedForAdmin` con una lista que incluye un cromo no faltante
- **THEN** el sistema ignora el cromo no faltante y completa unicamente los que estaban como faltantes

#### Scenario: Lista vacia
- **WHEN** la spec futura invoca `markStickersAsCompletedForAdmin` con una lista vacia
- **THEN** el sistema no modifica el documento y no actualiza `updatedAt`

### Requirement: Aviso de solapamiento con repetidos
El sistema SHALL mostrar un `alert` visible en la card de un cromo que este marcado como faltante y tambien exista como repetido. El `alert` SHALL explicar el solapamiento y SHALL permitir mantener la combinacion.

#### Scenario: Cromo como faltante y repetido
- **WHEN** el admin visualiza un cromo que es faltante y tambien repetido
- **THEN** la card muestra un `alert` con copy que explica la combinacion

#### Scenario: Cromo solo faltante
- **WHEN** el admin visualiza un cromo que es faltante pero no repetido
- **THEN** la card no muestra el `alert` de solapamiento

### Requirement: Atajo admin para marcar como completado
El sistema SHALL exponer en la vista de faltantes un atajo por cromo para marcarlo como completado. El atajo SHALL pedir confirmacion explicita antes de ejecutarse y SHALL eliminar el cromo del inventario.

#### Scenario: Marcar como completado desde la vista
- **WHEN** el admin activa el atajo y confirma la accion
- **THEN** el sistema elimina el cromo del inventario, actualiza `updatedAt` y refresca la vista

#### Scenario: Cancelar el atajo
- **WHEN** el admin cancela la confirmacion del atajo
- **THEN** el sistema no modifica el inventario

### Requirement: Compatibilidad con cromos repetidos existentes
El sistema SHALL permitir que un mismo cromo este marcado como faltante y tambien exista como repetido al mismo tiempo. El sistema SHALL no impedir esa combinacion en la UI ni en la persistencia.

#### Scenario: Cromo como faltante y repetido
- **WHEN** el admin marca `ARG-14` como faltante y `ARG-14` ya existe como repetido
- **THEN** ambas condiciones se mantienen independientes en sus respectivos repositorios

#### Scenario: UI consistente
- **WHEN** el admin abre `/admin/cromos/faltantes` y `/admin/cromos`
- **THEN** cada vista refleja su propio inventario sin afectar al otro

### Requirement: Rechazo automatico de propuestas con cromo no faltante
El sistema SHALL permitir a la spec futura de aprobacion de propuestas invocar la validacion de faltantes en el momento del envio y de la aprobacion. Si un cromo solicitado ya no es faltante, la propuesta SHALL persistirse con estado `rechazada automaticamente` y SHALL registrar el motivo para el admin.

#### Scenario: Propuesta con cromo no faltante al envio
- **WHEN** el flujo publico envia una propuesta y uno de los cromos solicitados ya no es faltante
- **THEN** el sistema persiste la propuesta como `rechazada automaticamente` y registra el cromo que causo el rechazo

#### Scenario: Propuesta pendiente que pierde un cromo antes de aprobarse
- **WHEN** una propuesta pendiente incluye un cromo y el admin lo marca como completado o lo quita de faltantes
- **THEN** la spec futura de aprobacion detecta el cambio y persiste la propuesta como `rechazada automaticamente` al evaluarla
