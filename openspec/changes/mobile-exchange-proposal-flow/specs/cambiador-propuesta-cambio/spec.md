## ADDED Requirements

### Requirement: Wizard mobile de 5 pasos para propuesta de intercambio
El sistema SHALL exponer, dentro de la sesion publica del cambiador en `/cambio/[token]`, un wizard mobile de 5 pasos para crear una propuesta de intercambio: (1) seleccionar cromos que el coleccionista quiere recibir, (2) revisar la regla aplicable por cada cromo seleccionado, (3) decidir por cada bloque si cumple la regla o si envia una contraoferta, (4) completar detalles de las contraofertas, y (5) revisar y enviar el resumen final.

#### Scenario: Progreso secuencial del wizard
- **WHEN** el cambiador entra a una sesion abierta y comienza a armar su propuesta
- **THEN** el sistema muestra el wizard de 5 pasos en orden, con progreso visible y accion principal para continuar o volver

#### Scenario: Reanudacion con borrador existente
- **WHEN** el cambiador reabre una sesion publica que ya tenia una propuesta en borrador
- **THEN** el sistema reanuda el wizard conservando la seleccion, decisiones y contraofertas guardadas en esa sesion

### Requirement: Seleccion de cromos que quiere recibir el coleccionista
En el paso 1, el sistema SHALL mostrar los cromos que el coleccionista quiere recibir y permitir al cambiador seleccionar unidades individuales que puede ofrecer. La pantalla SHALL incluir filtros por seleccion o pais, tipo de cromo y busqueda por numero o codigo.

#### Scenario: Seleccion con filtros
- **WHEN** el cambiador aplica filtros por pais, tipo o codigo en el paso 1
- **THEN** el sistema actualiza la lista visible sin perder los cromos ya seleccionados

#### Scenario: Seleccion de una sola unidad por cromo
- **WHEN** el cambiador selecciona `ARG-14`
- **THEN** el sistema agrega un unico bloque de propuesta para ese cromo sin pedir cantidad

### Requirement: Regla aplicable por cromo seleccionado
En el paso 2, el sistema SHALL mostrar la regla aplicable para cada cromo seleccionado. Si existe override por cromo, el sistema SHALL usarlo en lugar de la regla general y SHALL mostrar la etiqueta `Regla especial`; si no existe override, SHALL mostrar la etiqueta `Regla general`.

#### Scenario: Cromo con override por cromo
- **WHEN** el cambiador revisa un cromo seleccionado que tiene override especifico
- **THEN** el sistema muestra esa regla en lugar de la general y la etiqueta como `Regla especial`

#### Scenario: Cromo sin override especifico
- **WHEN** el cambiador revisa un cromo seleccionado que no tiene override especifico
- **THEN** el sistema muestra la regla general correspondiente y la etiqueta como `Regla general`

### Requirement: Decision por bloque entre cumplir o contraofertar
En el paso 3, el sistema SHALL pedir al cambiador una decision independiente por cada bloque de propuesta: `Cumplir regla` o `Proponer contraoferta`. El sistema SHALL permitir mezclar ambos modos dentro de la misma propuesta.

#### Scenario: Mezcla de bloques en una misma propuesta
- **WHEN** el cambiador marca `Cumplir regla` para `POR-15` y `Proponer contraoferta` para `MEX-07`
- **THEN** el sistema conserva ambas decisiones y permite continuar con una propuesta mixta

#### Scenario: Cambio de decision antes del resumen
- **WHEN** el cambiador vuelve al paso 3 y cambia un bloque de `Cumplir regla` a `Proponer contraoferta`
- **THEN** el sistema actualiza ese bloque sin afectar las decisiones de los demas cromos

### Requirement: Cumplimiento abstracto de la regla
Cuando el cambiador elige `Cumplir regla` para un bloque, el sistema SHALL registrar la propuesta de forma abstracta usando la cantidad y el tipo definidos por la regla aplicable. El sistema SHALL no exigir numeros exactos de cromos para ese bloque.

#### Scenario: Cumplir una regla general por tipo
- **WHEN** la regla aplicable para `BRA-03` pide `2 jugadores` y el cambiador marca `Cumplir regla`
- **THEN** la propuesta guarda ese bloque como cumplimiento abstracto de `2 jugadores` sin solicitar codigos exactos

### Requirement: Contraoferta explicita por cromo
Cuando el cambiador elige `Proponer contraoferta` para un bloque, el sistema SHALL permitir cambiar la cantidad, el tipo de cromo o proponer uno o mas cromos exactos como alternativa. Cada contraoferta SHALL pertenecer a un unico cromo solicitado y SHALL poder incluir una nota opcional.

#### Scenario: Contraoferta cambiando cantidad
- **WHEN** la regla para `MEX-07` pide `2 jugadores` y el cambiador propone `1 jugador`
- **THEN** el sistema guarda ese bloque como `Contraoferta` con la nueva cantidad y tipo

#### Scenario: Contraoferta con cromo exacto
- **WHEN** la regla para `ARG-14` no se cumple y el cambiador propone `POR-15`
- **THEN** el sistema guarda ese bloque como `Contraoferta` con detalle explicito del cromo exacto ofrecido

#### Scenario: Contraoferta a un override exacto con varios cromos exactos
- **WHEN** un override especifico pide un cromo exacto y el cambiador propone dos cromos exactos distintos en lugar de cumplirlo
- **THEN** el sistema acepta la contraoferta como excepcion explicita del bloque

### Requirement: Nota opcional solo en contraofertas
El sistema SHALL mostrar y persistir una nota opcional unicamente para bloques en modo `Contraoferta`. El sistema SHALL no pedir ni guardar nota para bloques que cumplen la regla.

#### Scenario: Nota presente en contraoferta
- **WHEN** el cambiador agrega una explicacion libre en un bloque de contraoferta
- **THEN** el sistema guarda la nota junto con ese bloque y la muestra en el resumen final

#### Scenario: Bloque que cumple regla
- **WHEN** el cambiador deja un bloque en modo `Cumplir regla`
- **THEN** el sistema no muestra ni persiste una nota libre para ese bloque

### Requirement: Resumen final priorizando lo que recibe el coleccionista
En el paso 5, el sistema SHALL mostrar un resumen final que priorice visualmente lo que recibe el coleccionista. El resumen SHALL listar despues lo que recibe el cambiador y SHALL mostrar etiquetas visibles por bloque, incluyendo `Cumple regla`, `Contraoferta`, `Regla general` y `Regla especial` cuando apliquen.

#### Scenario: Resumen de propuesta mixta
- **WHEN** la propuesta contiene bloques que cumplen regla y otros con contraoferta
- **THEN** el resumen muestra ambos tipos con sus etiquetas correspondientes y presenta primero lo que recibe el coleccionista

### Requirement: Envio de propuesta pendiente de aprobacion
Al confirmar el paso 5, el sistema SHALL enviar la propuesta y marcarla con estado `Pendiente de aprobacion`. Despues del envio, el sistema SHALL mostrar una vista detallada de la propuesta enviada.

#### Scenario: Envio exitoso de propuesta
- **WHEN** el cambiador confirma una propuesta valida en el resumen final
- **THEN** el sistema guarda la propuesta con estado `Pendiente de aprobacion` y muestra el detalle completo de lo enviado

#### Scenario: Vista posterior al envio
- **WHEN** el cambiador abre una propuesta ya enviada desde la misma sesion
- **THEN** el sistema muestra el detalle de lo que recibe el coleccionista, lo que recibe el cambiador, las etiquetas del bloque y las notas de contraoferta si existen
