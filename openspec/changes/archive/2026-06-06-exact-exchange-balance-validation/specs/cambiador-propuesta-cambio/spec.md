## ADDED Requirements

### Requirement: Balance global exacto antes de enviar
El sistema SHALL calcular en el paso 3 las unidades habilitadas por todos los bloques seleccionados y SHALL compararlas contra la suma total de `requestedRepeateds` elegidos por el cambiador. El sistema SHALL permitir el envio solo cuando ambos totales sean exactamente iguales.

#### Scenario: Balance exacto valido
- **WHEN** la propuesta del cambiador habilita `4` unidades en total y el cambiador pide `4` repetidos del coleccionista
- **THEN** el sistema habilita el envio de la propuesta

#### Scenario: El cambiador pide menos de lo habilitado
- **WHEN** la propuesta del cambiador habilita `10` unidades en total y el cambiador pide `8` repetidos del coleccionista
- **THEN** el sistema bloquea el envio y muestra que sobran `2` unidades por ajustar

#### Scenario: El cambiador pide mas de lo habilitado
- **WHEN** la propuesta del cambiador habilita `2` unidades en total y el cambiador pide `3` repetidos del coleccionista
- **THEN** el sistema bloquea el envio y muestra que faltan `1` unidad por ajustar

## MODIFIED Requirements

### Requirement: Cumplimiento abstracto de la regla
Cuando el cambiador elige `Aceptar la regla` para un bloque, el sistema SHALL registrar la propuesta de forma abstracta aceptando la regla aplicable sin exigir numeros exactos de cromos para ese bloque. Para el calculo de balance global, el sistema SHALL convertir esa regla aceptada en unidades habilitadas usando la mayor cantidad positiva entre las opciones abstractas activas de la regla aplicable.

#### Scenario: Cumplir una regla general por tipo
- **WHEN** la regla aplicable para `BRA-03` ofrece como opcion `2 jugadores` y el cambiador marca `Aceptar la regla`
- **THEN** la propuesta guarda ese bloque como cumplimiento abstracto de `2 jugadores` sin solicitar codigos exactos

#### Scenario: Regla OR valida aporta su capacidad maxima coherente
- **WHEN** la regla aplicable para `ARG-10` ofrece `2 jugadores o 1 badge o 2 cualquiera` y el cambiador marca `Aceptar la regla`
- **THEN** el sistema cuenta ese bloque como `2` unidades habilitadas para el balance global

### Requirement: Contraoferta explicita por cromo
Cuando el cambiador elige `Proponer otra opcion` para un bloque, el sistema SHALL permitir en el paso 1 cambiar la cantidad por tipo de cromo y proponer uno o mas cromos exactos como componentes adicionales de la misma contraoferta. Cada contraoferta SHALL pertenecer a un unico cromo solicitado y SHALL poder incluir una nota opcional. Para el calculo de balance global, las cantidades por tipo SHALL sustituir la regla base abstracta y las unidades habilitadas del bloque SHALL ser la suma de todas las cantidades por tipo mas `1` por cada `exactStickerCode`.

#### Scenario: Contraoferta cambiando cantidad
- **WHEN** la regla para `MEX-07` pide `2 jugadores` y el cambiador propone `1 jugador`
- **THEN** el sistema guarda ese bloque como `Contraoferta` con la nueva cantidad y tipo

#### Scenario: Contraoferta con cromo exacto
- **WHEN** la regla para `ARG-14` no se cumple y el cambiador propone `POR-15`
- **THEN** el sistema guarda ese bloque como `Contraoferta` con detalle explicito del cromo exacto ofrecido

#### Scenario: Contraoferta suma tipos y cromos exactos
- **WHEN** el cambiador propone `1 jugador` y ademas agrega `POR-15` en el mismo bloque
- **THEN** el sistema cuenta ese bloque como `2` unidades habilitadas para el balance global

#### Scenario: Contraoferta reemplaza la regla base abstracta
- **WHEN** la regla base del bloque pide `2 jugadores` y el cambiador propone `10 jugadores`
- **THEN** el sistema cuenta ese bloque como `10` unidades habilitadas y no suma adicionalmente las `2` de la regla base

### Requirement: Resumen final priorizando lo que recibe el coleccionista
En el paso 3, el sistema SHALL mostrar primero el estado del balance global, luego la guidance de correccion, despues la lista de repetidos que recibe el cambiador y despues el detalle de bloques ofrecidos al coleccionista. El resumen SHALL mostrar etiquetas visibles por bloque, incluyendo `Acepta la regla` y `Propone otra opcion` cuando apliquen, y SHALL usar el mismo copy natural del flujo para la condicion de intercambio de cada bloque, por ejemplo `Se cambia por 2 cromos de jugador`.

#### Scenario: Resumen de propuesta mixta
- **WHEN** la propuesta contiene bloques que cumplen regla y otros con contraoferta
- **THEN** el resumen muestra ambos tipos con sus etiquetas correspondientes, prioriza el bloque de balance y deja el detalle de bloques ofrecidos mas abajo

#### Scenario: Guidance por balance incompleto
- **WHEN** el resumen detecta que el cambiador pide menos o mas unidades de las habilitadas
- **THEN** el sistema muestra un mensaje distinto para `faltan` o `sobran` unidades y sugiere reducir repetidos, pedir mas repetidos o editar la oferta segun corresponda

### Requirement: Correccion guiada desde el paso 3
Cuando el balance global no cierre en el paso 3, el sistema SHALL permitir ajustar inline los `requestedRepeateds` y SHALL ofrecer una accion `Editar oferta` por bloque que abra un drawer mobile sin sacar al usuario del resumen final.

#### Scenario: Ajuste inline de repetidos pedidos
- **WHEN** el cambiador detecta en el paso 3 que faltan o sobran unidades
- **THEN** el sistema permite corregir cantidad o quitar repetidos desde la misma pantalla sin salir del resumen

#### Scenario: Edicion de una oferta en drawer
- **WHEN** el cambiador pulsa `Editar oferta` en un bloque del paso 3
- **THEN** el sistema abre un drawer mobile para editar ese bloque y mantiene visible el contexto del resumen al cerrarlo

### Requirement: Drawer de edicion de oferta en paso 3
El drawer de `Editar oferta` SHALL permitir cambiar entre `Aceptar la regla` y `Proponer otra opcion`, mostrar la regla aplicable, editar los campos de contraoferta cuando corresponda y recalcular en vivo cuantas unidades habilita ese bloque.

#### Scenario: Cambiar de fulfill a counteroffer desde drawer
- **WHEN** el cambiador abre el drawer de un bloque en `Aceptar la regla` y cambia a `Proponer otra opcion`
- **THEN** el sistema habilita la edicion de cantidades por tipo, cromos exactos y nota sin sacar al usuario del paso 3

#### Scenario: Volver de counteroffer a fulfill desde drawer
- **WHEN** el cambiador abre el drawer de un bloque con contraoferta cargada y vuelve a `Aceptar la regla`
- **THEN** el sistema pide una confirmacion ligera antes de descartar la contraoferta personalizada

#### Scenario: Guardar cambios en drawer
- **WHEN** el cambiador confirma los cambios del drawer
- **THEN** el sistema cierra el drawer, recalcula el balance global y devuelve el foco visual al bloque de balance del paso 3

### Requirement: Envio de propuesta pendiente de aprobacion
Al confirmar el paso 3, el sistema SHALL enviar la propuesta y marcarla con estado `Pendiente de aprobacion` solo si el balance global exacto es valido. Despues del envio, el sistema SHALL mostrar una vista detallada de la propuesta enviada.

#### Scenario: Envio exitoso de propuesta
- **WHEN** el cambiador confirma una propuesta valida en el resumen final y el balance global exacto coincide
- **THEN** el sistema guarda la propuesta con estado `Pendiente de aprobacion` y muestra el detalle completo de lo enviado

#### Scenario: Envio bloqueado por balance invalido
- **WHEN** el cambiador intenta enviar una propuesta cuyo balance global no cierra exacto
- **THEN** el sistema rechaza el envio, conserva el borrador y devuelve guidance explicita para ajustar la propuesta

#### Scenario: Vista posterior al envio
- **WHEN** el cambiador abre una propuesta ya enviada desde la misma sesion
- **THEN** el sistema muestra el detalle de lo que recibe el coleccionista, lo que recibe el cambiador, las etiquetas del bloque y las notas de contraoferta si existen
