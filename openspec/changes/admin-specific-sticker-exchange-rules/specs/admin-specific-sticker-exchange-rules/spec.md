## ADDED Requirements

### Requirement: Override por cromo con componente abstracto
El sistema SHALL permitir que el admin defina un componente abstracto opcional por cromo en `/admin/intercambio`, expresado como un `ExchangeRule` con cantidades por cada `OfferType`. Cuando el componente abstracto esta activo con al menos un `OfferType` mayor a `0`, SHALL tener prioridad sobre la regla general. Cuando todos los `OfferType` del componente abstracto son `0`, el sistema SHALL tratar el componente abstracto como desactivado y SHALL aplicar la regla general o el componente exacto si existe.

#### Scenario: Cromo con solo componente abstracto activo
- **WHEN** el admin guarda un override para `ARG-14` con componente abstracto `{ PLAYER: 2, ANY: 1 }` y sin componente exacto
- **THEN** el sistema persiste el override y al servir la regla para `ARG-14` se devuelve la composicion con un unico componente abstracto

#### Scenario: Cromo con componente abstracto en 0 y componente exacto activo
- **WHEN** el admin guarda un override para `ARG-14` con componente abstracto en `0` y componente exacto `POR-15`
- **THEN** el sistema trata el componente abstracto como desactivado y conserva el componente exacto, devolviendo la composicion con un unico componente exacto

#### Scenario: Cromo con componente abstracto activo y exact desactivado
- **WHEN** el admin guarda un override para `ARG-14` con componente abstracto `{ PLAYER: 2 }` y sin componente exacto
- **THEN** el sistema trata ese cromo como `Regla especial por tipo` y aplica solo la regla abstracta

### Requirement: Override por cromo con componente exacto
El sistema SHALL permitir que el admin defina un componente exacto opcional por cromo en `/admin/intercambio`, expresado como un unico codigo de cromo especifico del album. El sistema SHALL rechazar cualquier intento de guardar un cromo exacto que el admin no tenga marcado como faltante, validando mediante `isStickerMissingForAdmin` importado directamente desde `src/lib/missing.ts`.

#### Scenario: Cromo exacto valido como faltante
- **WHEN** el admin guarda un override para `ARG-14` con componente exacto `POR-15` y `isStickerMissingForAdmin(ownerEmail, "POR-15")` devuelve `true`
- **THEN** el sistema persiste el override y al servir la regla para `ARG-14` se devuelve la composicion con un unico componente exacto

#### Scenario: Cromo exacto no faltante
- **WHEN** el admin intenta guardar un override para `ARG-14` con componente exacto `BRA-09` y `isStickerMissingForAdmin(ownerEmail, "BRA-09")` devuelve `false`
- **THEN** el sistema rechaza la operacion, no persiste el componente exacto y muestra un error indicando que el cromo exacto debe ser faltante

#### Scenario: Sin inventario de faltantes disponible
- **WHEN** el sistema intenta validar un componente exacto y `isStickerMissingForAdmin` no esta implementado
- **THEN** el sistema rechaza el guardado del componente exacto y registra la causa para corregirla

### Requirement: Compatibilidad con overrides existentes
El sistema SHALL leer overrides persistidos en el formato anterior como un override con componente abstracto igual a la regla almacenada y componente exacto `null`. Al guardar, el sistema SHALL persistir siempre el nuevo formato.

#### Scenario: Lectura de override abstracto antiguo
- **WHEN** el repositorio contiene un override `{ "ARG-14": { PLAYER: 2, BADGE: 1, TEAM_PHOTO: 1, SPECIAL: 1, ANY: 2 } }`
- **THEN** el sistema lo expone como override activo con un componente abstracto y sin componente exacto

#### Scenario: Persistencia de override actualizado
- **WHEN** el admin guarda un override en el nuevo formato
- **THEN** el sistema lo escribe en el repositorio siguiendo la estructura `{ abstract, exact }` aunque solo uno de los componentes tenga valor

### Requirement: Toggle unico para usar regla general
El sistema SHALL exponer en la UI admin un toggle unico `Usar regla general` que limpia el componente abstracto y el componente exacto del cromo seleccionado. Cuando ambos componentes quedan vacios, el sistema SHALL eliminar el override y SHALL aplicar la regla general.

#### Scenario: Activar el toggle con override existente
- **WHEN** el admin activa `Usar regla general` para un cromo con override activo
- **THEN** el sistema limpia ambos componentes, elimina el override del documento y el cromo pasa a usar la regla general

#### Scenario: Estado tras toggle
- **WHEN** el admin confirma el toggle `Usar regla general`
- **THEN** el sistema persiste el documento sin la entrada del cromo y mantiene `updatedAt`

### Requirement: Valores globales visibles al editar overrides
El sistema SHALL mostrar en `/admin/intercambio` los valores globales efectivos como base visible de los campos abstractos cuando un cromo no tiene override guardado. El sistema SHALL permitir editar desde esa base sin obligar al admin a inferir la regla actual desde otra seccion.

#### Scenario: Cromo sin override guardado
- **WHEN** el admin abre la edicion de un cromo sin override
- **THEN** los campos abstractos muestran los valores de la regla global correspondiente al tipo del cromo

#### Scenario: Cromo con exacto vacio
- **WHEN** el admin abre la edicion de un cromo sin componente exacto guardado
- **THEN** el campo del cromo exacto aparece vacio mientras el abstracto sigue mostrando la base global

### Requirement: `/admin/cromos` se limita al inventario de repetidos
El sistema SHALL mantener la pantalla `/admin/cromos` enfocada exclusivamente en el inventario de repetidos. La pagina SHALL permitir editar cantidades por cromo, pero SHALL no exponer controles ni previews de reglas de intercambio por cromo.

#### Scenario: Admin abre `/admin/cromos`
- **WHEN** el admin navega a `/admin/cromos`
- **THEN** la interfaz muestra solo cantidades de repetidos y acciones relacionadas al inventario

#### Scenario: Regla por cromo se edita en otra surface
- **WHEN** el admin necesita cambiar una regla especial por tipo o por cromo
- **THEN** el flujo ocurre en `/admin/intercambio` y no dentro de la grilla de repetidos

### Requirement: Resolucion de la regla como lista ordenada de componentes
El sistema SHALL resolver la regla aplicable para un cromo como una lista ordenada de componentes. Cuando coexisten componente abstracto y exacto, el componente abstracto SHALL aparecer primero y el exacto despues. Cuando no hay override, el sistema SHALL devolver una lista vacia con `source: "global"`.

#### Scenario: Cromo con abstract y exact activos
- **WHEN** el flujo publico consulta la regla aplicable para un cromo con override con ambos componentes
- **THEN** el sistema devuelve la lista `[abstracto, exacto]` con el orden indicado

#### Scenario: Cromo sin override
- **WHEN** el flujo publico consulta la regla aplicable para un cromo sin override
- **THEN** el sistema devuelve una lista vacia con `source: "global"` y el flujo publico aplica la regla general

#### Scenario: Lista vacia con override
- **WHEN** el resolvedor evalua un cromo con override sin componentes activos
- **THEN** el sistema trata el resultado como `source: "global"`

### Requirement: Etiquetas visibles para el flujo publico
El sistema SHALL etiquetar el componente abstracto como `Regla especial por tipo` y el componente exacto como `Regla especial por cromo` cuando entregue la composicion al flujo publico.

#### Scenario: Etiquetado de componentes
- **WHEN** el resolvedor entrega una composicion con abstracto y exacto activos
- **THEN** el flujo publico muestra la composicion con sus etiquetas correspondientes

### Requirement: Importacion directa del contrato de faltantes
El sistema SHALL importar `isStickerMissingForAdmin` directamente desde `src/lib/missing.ts` para validar el componente exacto. El sistema SHALL no definir una capa intermedia ni acceder al store directamente.

#### Scenario: Importacion correcta
- **WHEN** el codigo de validacion se compila
- **THEN** la importacion desde `src/lib/missing.ts` resuelve y el tipo del retorno es `Promise<boolean>`

#### Scenario: Stub fail-safe
- **WHEN** `src/lib/missing.ts` expone un stub que devuelve `false` por defecto
- **THEN** el sistema rechaza cualquier intento de guardar un componente exacto y muestra el motivo de validacion

### Requirement: Rechazo automatico de propuestas con cromo exacto no faltante
El sistema SHALL permitir que el flujo publico consulte el estado de faltantes al enviar una propuesta. Si un cromo solicitado forma parte del componente exacto de un override y ya no es faltante, el sistema SHALL persistir la propuesta como `rechazada automaticamente` y SHALL registrar el motivo para el admin.

#### Scenario: Propuesta con cromo exacto no faltante
- **WHEN** el cambiador envia una propuesta que incluye un cromo cuyo override exacto ya no es faltante
- **THEN** el sistema persiste la propuesta como `rechazada automaticamente` y muestra el motivo al admin

#### Scenario: Cromo exacto sigue faltante
- **WHEN** el cambiador envia una propuesta cuyos cromos exactos siguen siendo faltantes
- **THEN** el sistema persiste la propuesta como pendiente y la entrega al admin normalmente
