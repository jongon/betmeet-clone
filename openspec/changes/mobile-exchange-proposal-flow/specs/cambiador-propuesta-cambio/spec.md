## ADDED Requirements

### Requirement: Wizard mobile de 4 pasos para propuesta de intercambio
El sistema SHALL exponer, dentro de la sesion publica del cambiador en `/cambio/[token]`, un wizard mobile de 4 pasos para crear una propuesta de intercambio: (1) seleccionar cromos que el coleccionista quiere recibir viendo ya la regla aplicable, (2) seleccionar desde los repetidos reales del coleccionista lo que el cambiador quiere recibir y decidir por cada bloque si acepta la regla o si propone otra opcion, (3) completar detalles de las contraofertas, y (4) revisar y enviar el resumen final.

#### Scenario: Progreso secuencial del wizard
- **WHEN** el cambiador entra a una sesion abierta y comienza a armar su propuesta
- **THEN** el sistema muestra el wizard de 4 pasos en orden, con progreso visible y accion principal para continuar o volver

#### Scenario: Reanudacion con borrador existente
- **WHEN** el cambiador reabre una sesion publica que ya tenia una propuesta en borrador
- **THEN** el sistema reanuda el wizard conservando la seleccion, decisiones y contraofertas guardadas en esa sesion

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
Cuando el cambiador elige `Aceptar la regla` para un bloque, el sistema SHALL registrar la propuesta de forma abstracta aceptando una de las opciones permitidas por la regla aplicable. El sistema SHALL no exigir numeros exactos de cromos para ese bloque.

#### Scenario: Cumplir una regla general por tipo
- **WHEN** la regla aplicable para `BRA-03` ofrece como opcion `2 jugadores` y el cambiador marca `Aceptar la regla`
- **THEN** la propuesta guarda ese bloque como cumplimiento abstracto de `2 jugadores` sin solicitar codigos exactos

### Requirement: Contraoferta explicita por cromo
Cuando el cambiador elige `Proponer otra opcion` para un bloque, el sistema SHALL permitir en el paso 3 cambiar la cantidad, el tipo de cromo o proponer uno o mas cromos exactos como alternativa. Cada contraoferta SHALL pertenecer a un unico cromo solicitado y SHALL poder incluir una nota opcional.

#### Scenario: Contraoferta cambiando cantidad
- **WHEN** la regla para `MEX-07` pide `2 jugadores` y el cambiador propone `1 jugador`
- **THEN** el sistema guarda ese bloque como `Contraoferta` con la nueva cantidad y tipo

#### Scenario: Contraoferta con cromo exacto
- **WHEN** la regla para `ARG-14` no se cumple y el cambiador propone `POR-15`
- **THEN** el sistema guarda ese bloque como `Contraoferta` con detalle explicito del cromo exacto ofrecido

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
El sistema SHALL validar que todos los `exactStickerCodes` escritos en las contraofertas de la propuesta existan entre los repetidos del coleccionista antes de que el cambiador pueda avanzar al siguiente paso del wizard. Si algun cromo exacto opcional no esta entre los repetidos, el sistema SHALL bloquear el avance y SHALL mostrar un mensaje con el codigo invalido. El envio final SHALL revalidar esta misma condicion como defensa adicional.

#### Scenario: Validacion previa al paso siguiente
- **WHEN** el cambiador pulsa `Continuar` en cualquier paso donde existan contraofertas con cromos exactos opcionales
- **THEN** el sistema comprueba que todos esos codigos existan entre los repetidos del coleccionista antes de mover al siguiente paso

#### Scenario: Revalidacion al enviar una propuesta con cromos exactos
- **WHEN** el cambiador intenta enviar una propuesta cuyos cromos exactos opcionales ya no estan entre los repetidos del coleccionista
- **THEN** el sistema rechaza el envio, no persiste la propuesta como pendiente y devuelve el motivo del bloqueo

### Requirement: Nota opcional solo en contraofertas
El sistema SHALL mostrar y persistir una nota opcional unicamente para bloques en modo `Proponer otra opcion`. El sistema SHALL no pedir ni guardar nota para bloques que aceptan la regla.

#### Scenario: Nota presente en contraoferta
- **WHEN** el cambiador agrega una explicacion libre en un bloque de contraoferta
- **THEN** el sistema guarda la nota junto con ese bloque y la muestra en el resumen final

#### Scenario: Bloque que cumple regla
- **WHEN** el cambiador deja un bloque en modo `Aceptar la regla`
- **THEN** el sistema no muestra ni persiste una nota libre para ese bloque

### Requirement: Resumen final priorizando lo que recibe el coleccionista
En el paso 4, el sistema SHALL mostrar un resumen final que priorice visualmente lo que recibe el coleccionista. El resumen SHALL listar despues, como lista global independiente, lo que recibe el cambiador desde los repetidos del coleccionista y SHALL mostrar etiquetas visibles por bloque, incluyendo `Acepta la regla` y `Propone otra opcion` cuando apliquen. Cuando muestre la condicion de intercambio de un bloque, SHALL usar el mismo copy natural del flujo, por ejemplo `Se cambia por 2 cromos de jugador`.

#### Scenario: Resumen de propuesta mixta
- **WHEN** la propuesta contiene bloques que cumplen regla y otros con contraoferta
- **THEN** el resumen muestra ambos tipos con sus etiquetas correspondientes y presenta primero lo que recibe el coleccionista

### Requirement: Envio de propuesta pendiente de aprobacion
Al confirmar el paso 4, el sistema SHALL enviar la propuesta y marcarla con estado `Pendiente de aprobacion`. Despues del envio, el sistema SHALL mostrar una vista detallada de la propuesta enviada.

#### Scenario: Envio exitoso de propuesta
- **WHEN** el cambiador confirma una propuesta valida en el resumen final
- **THEN** el sistema guarda la propuesta con estado `Pendiente de aprobacion` y muestra el detalle completo de lo enviado

#### Scenario: Vista posterior al envio
- **WHEN** el cambiador abre una propuesta ya enviada desde la misma sesion
- **THEN** el sistema muestra el detalle de lo que recibe el coleccionista, lo que recibe el cambiador, las etiquetas del bloque y las notas de contraoferta si existen
