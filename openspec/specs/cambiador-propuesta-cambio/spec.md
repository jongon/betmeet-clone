## Purpose

Definir el comportamiento publico del wizard de propuesta de intercambio en `/cambio/[token]` que depende del catalogo del album 2026, empezando por el orden oficial de faltantes, repetidos y selecciones rehidratadas.

## Requirements

### Requirement: Orden oficial del album en el wizard publico
El sistema SHALL mostrar los cromos del flujo publico de propuesta en `/cambio/[token]` siguiendo el orden oficial del album 2026. La lista de cromos faltantes del coleccionista SHALL mostrar `FWC` primero y luego las selecciones segun el orden canonico del catalogo. La lista de repetidos disponibles del coleccionista SHALL seguir ese mismo orden.

#### Scenario: Faltantes en orden de album
- **WHEN** el cambiador entra a una sesion y ve los cromos que el coleccionista necesita
- **THEN** la lista visible respeta el orden oficial del album y no un orden alfabetico por codigo

#### Scenario: Repetidos disponibles en orden de album
- **WHEN** el cambiador revisa los repetidos que puede pedir al coleccionista
- **THEN** la lista visible respeta el mismo orden oficial del album

### Requirement: Rehidratacion de seleccion preservando el orden canonico
Cuando el sistema reanuda una sesion publica con seleccion previa de cromos, SHALL reconstruir la propuesta preservando el orden canonico del album para los codigos seleccionados y para los repetidos solicitados.

#### Scenario: Sesion reanudada con codigos seleccionados
- **WHEN** el cambiador reabre una sesion que ya tenia cromos seleccionados
- **THEN** el sistema muestra esos codigos en el orden oficial del album y no por `localeCompare`

### Requirement: Wizard mobile de 3 pasos para propuesta de intercambio
El sistema SHALL exponer, dentro de la sesion publica del cambiador en `/cambio/[token]`, un wizard mobile de 3 pasos para crear una propuesta de intercambio: (1) elegir que ofreces, seleccionando cromos y editando contraofertas inline en un panel colapsable, (2) elegir que quieres recibir seleccionando desde los repetidos reales del coleccionista, y (3) revisar y enviar el resumen final.

#### Scenario: Progreso secuencial del wizard
- **WHEN** el cambiador entra a una sesion abierta y comienza a armar su propuesta
- **THEN** el sistema muestra el wizard de 3 pasos en orden, con progreso visible y accion principal para continuar o volver

#### Scenario: Reanudacion con borrador existente
- **WHEN** el cambiador reabre una sesion publica que ya tenia una propuesta en borrador
- **THEN** el sistema reanuda el wizard conservando la seleccion, decisiones y contraofertas guardadas en esa sesion

#### Scenario: No persistencia del buscador entre pasos
- **WHEN** el cambiador navega a un paso distinto o avanza en el wizard
- **THEN** el sistema limpia el buscador de cromos para evitar filtros residuales en la nueva vista

### Requirement: Seleccion de cromos que quiere recibir el coleccionista
En el paso 1, el sistema SHALL mostrar los cromos que el coleccionista quiere recibir y permitir al cambiador seleccionar unidades individuales que puede ofrecer. La pantalla SHALL incluir un unico buscador capaz de encontrar por seleccion o pais, tipo de cromo, numero o codigo, SHALL mostrar en la misma card la regla aplicable a cada cromo y SHALL dejar embebida en esa misma card la decision de mantener la regla o pasar a contraoferta.

#### Scenario: Seleccion con buscador unico
- **WHEN** el cambiador busca por pais, tipo o codigo en el paso 1
- **THEN** el sistema actualiza la lista visible sin perder los cromos ya seleccionados

#### Scenario: Seleccion de una sola unidad por cromo
- **WHEN** el cambiador selecciona `ARG-14`
- **THEN** el sistema agrega un unico bloque de propuesta para ese cromo sin pedir cantidad

#### Scenario: Cromo seleccionado acepta la regla por defecto
- **WHEN** el cambiador agrega un cromo en el paso 1
- **THEN** el sistema lo marca por defecto como `Aceptar la regla` sin exigir una decision adicional en otro paso

### Requirement: Regla aplicable por cromo seleccionado
En el paso 1, el sistema SHALL mostrar la regla aplicable para cada cromo visible usando copy directo orientado al usuario, por ejemplo `Se cambia por 2 cromos de jugador` o `Se cambia por 1 badge o por POR-15`. Si existe override por cromo, el sistema SHALL usarlo en lugar de la regla general para resolver esa frase. Cuando la regla abstracta permita la misma cantidad positiva para `badge`, `cromo de jugador`, `foto de equipo` y `cromo especial`, el sistema SHALL resumirla como `Se cambia por cualquier tipo de cromo` o `Se cambia por N cromos de cualquier tipo`.

#### Scenario: Regla abstracta mostrada como alternativas
- **WHEN** la regla abstracta de un cromo tiene varios `OfferType` activos
- **THEN** el sistema muestra esas opciones como alternativas `OR`, dejando claro que basta con una de ellas y no con todas a la vez

#### Scenario: Cromo con override por cromo
- **WHEN** el cambiador revisa un cromo seleccionado que tiene override especifico
- **THEN** el sistema muestra esa condicion resuelta en lugar de la general usando una frase natural de intercambio

#### Scenario: Cromo sin override especifico
- **WHEN** el cambiador revisa un cromo seleccionado que no tiene override especifico
- **THEN** el sistema muestra la condicion general correspondiente usando una frase natural de intercambio

### Requirement: Seleccion global de repetidos que quiere recibir el cambiador
En el paso 2, el sistema SHALL mostrar el inventario real de repetidos del coleccionista y permitir al cambiador seleccionar que cromos quiere recibir. Esa seleccion SHALL persistirse como una lista global independiente de los bloques por cromo ofrecido. Si un cromo tiene mas de una copia disponible, el sistema SHALL permitir ajustar la cantidad desde `1` hasta el maximo disponible.

#### Scenario: Seleccion de un repetido disponible
- **WHEN** el cambiador selecciona `ARG-7` de los repetidos del coleccionista
- **THEN** el sistema agrega `ARG-7` a la lista global de repetidos solicitados con cantidad inicial `1`

#### Scenario: Ajuste de cantidad segun inventario
- **WHEN** el coleccionista tiene `ARG-7 x3` y el cambiador ajusta la cantidad solicitada
- **THEN** el sistema permite elegir entre `1` y `3`, sin superar el inventario disponible

#### Scenario: Repetido sin stock suficiente
- **WHEN** el cambiador intenta pedir mas copias de un cromo de las que existen en repetidos
- **THEN** el sistema impide superar la cantidad disponible en el inventario del coleccionista

### Requirement: Sincronizacion automatica de cromos exactos opcionales con repetidos solicitados
El sistema SHALL agregar automaticamente a la lista global de repetidos solicitados del paso 2 todo `exactStickerCode` valido escrito en una contraoferta. Esos cromos SHALL permanecer seleccionados y no SHALL poder desmarcarse manualmente mientras sigan referenciados por alguna contraoferta activa. El sistema SHALL mostrar una notificacion al usuario cuando se agregue de esta forma un cromo de forma automatica.

#### Scenario: Cromo exacto valido aparece marcado en paso 2
- **WHEN** el cambiador escribe `POR-15` como cromo exacto opcional en una contraoferta valida
- **THEN** el sistema marca automaticamente `POR-15` en el paso 2 dentro de los repetidos que quiere recibir el cambiador y notifica al usuario

#### Scenario: Cromo exacto sincronizado queda bloqueado en paso 2
- **WHEN** un repetido fue marcado automaticamente porque esta referenciado por una contraoferta activa
- **THEN** el sistema lo muestra con una diferenciacion visual de card bloqueada y no permite desmarcarlo manualmente en el paso 2

#### Scenario: Quitar la referencia libera el repetido sincronizado
- **WHEN** el cambiador elimina `POR-15` de la contraoferta o quita esa contraoferta
- **THEN** el sistema deja de tratar `POR-15` como repetido bloqueado por el paso 1 y vuelve a permitir editarlo en el paso 2

### Requirement: Decision por bloque entre cumplir o contraofertar
En el paso 1, el sistema SHALL dejar por defecto cada bloque nuevo en modo `Aceptar la regla` y SHALL ofrecer en la misma fila una unica accion visible para desviarse: `Proponer otra opcion`. Si el bloque ya esta en contraoferta, el sistema SHALL reemplazar esa accion por `Quitar contraoferta` para volver a `Aceptar la regla` sin sacar el cromo de la propuesta.

#### Scenario: Mezcla de bloques en una misma propuesta
- **WHEN** el cambiador marca `Aceptar la regla` para `POR-15` y `Proponer otra opcion` para `MEX-07`
- **THEN** el sistema conserva ambas decisiones y permite continuar con una propuesta mixta

#### Scenario: Cambio de decision antes del resumen
- **WHEN** el cambiador vuelve al paso 1 y cambia un bloque de `Aceptar la regla` a `Proponer otra opcion`
- **THEN** el sistema actualiza ese bloque sin afectar las decisiones de los demas cromos

#### Scenario: Quitar contraoferta sin deseleccionar el cromo
- **WHEN** el cambiador pulsa `Quitar contraoferta` en un bloque que ya estaba en `Proponer otra opcion`
- **THEN** el sistema devuelve ese bloque a `Aceptar la regla` y mantiene el cromo seleccionado en la propuesta

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

#### Scenario: Contraoferta a un override exacto con varios cromos exactos
- **WHEN** un override especifico pide un cromo exacto y el cambiador propone dos cromos exactos distintos en lugar de cumplirlo
- **THEN** el sistema acepta la contraoferta como excepcion explicita del bloque

#### Scenario: Contraoferta con cromos exactos vigentes
- **WHEN** el cambiador escribe `POR-15, ARG-7` en los cromos exactos opcionales y ambos existen entre los repetidos del coleccionista
- **THEN** el sistema permite continuar al siguiente paso

#### Scenario: Contraoferta con cromo exacto no repetido
- **WHEN** el cambiador escribe `POR-15, ARG-7` en los cromos exactos opcionales y alguno de esos cromos no esta entre los repetidos del coleccionista
- **THEN** el sistema bloquea el avance al siguiente paso y muestra un motivo explicito con el codigo invalido

### Requirement: Validacion de cromos exactos opcionales antes de avanzar
El sistema SHALL validar que todos los `exactStickerCodes` escritos en las contraofertas de la propuesta existan entre los repetidos del coleccionista antes de que el cambiador pueda avanzar al siguiente paso del wizard. Si algun cromo exacto opcional no esta entre los repetidos o tiene algun error, el sistema SHALL limpiar el buscador de cromos para asegurar que la card ofensora sea visible, SHALL bloquear el avance, y SHALL mostrar un mensaje con el codigo invalido. El envio final SHALL revalidar esta misma condicion como defensa adicional.

#### Scenario: Validacion previa al paso siguiente con filtro de busqueda activo
- **WHEN** el cambiador pulsa `Continuar` con un filtro activo y existe un error de validacion en un cromo
- **THEN** el sistema limpia el buscador para que todas las cards sean visibles, realiza scroll hasta la card con el error y lo muestra debajo del campo

#### Scenario: Revalidacion al enviar una propuesta con cromos exactos
- **WHEN** el cambiador intenta enviar una propuesta cuyos cromos exactos opcionales ya no estan entre los repetidos del coleccionista
- **THEN** el sistema rechaza el envio, no persiste la propuesta como pendiente y devuelve el motivo del bloqueo

### Requirement: Unicidad global de cromos exactos opcionales
El sistema SHALL impedir que un mismo `exactStickerCode` aparezca mas de una vez entre todas las contraofertas activas de la propuesta.

#### Scenario: Codigo exacto repetido en otra contraoferta
- **WHEN** el cambiador intenta usar `POR-15` en una segunda contraoferta despues de haberlo usado ya en otra
- **THEN** el sistema rechaza esa entrada y muestra un mensaje explicito indicando que ese cromo exacto ya fue usado en otra propuesta

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

### Requirement: Nota opcional solo en contraofertas
El sistema SHALL mostrar y persistir una nota opcional unicamente para bloques en modo `Proponer otra opcion`. El sistema SHALL no pedir ni guardar nota para bloques que aceptan la regla.

#### Scenario: Nota presente en contraoferta
- **WHEN** el cambiador agrega una explicacion libre en un bloque de contraoferta
- **THEN** el sistema guarda la nota junto con ese bloque y la muestra en el resumen final

#### Scenario: Bloque que cumple regla
- **WHEN** el cambiador deja un bloque en modo `Aceptar la regla`
- **THEN** el sistema no muestra ni persiste una nota libre para ese bloque

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
