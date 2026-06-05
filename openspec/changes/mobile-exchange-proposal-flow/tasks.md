## 1. Modelo de propuesta y persistencia

- [x] 1.1 Extender el modelo de sesion publica del cambiador para guardar un borrador de propuesta por cromo y el estado final `pending`
- [x] 1.2 Definir la estructura de bloque independiente por cromo con modo `fulfill` o `counteroffer`
- [x] 1.3 Persistir por bloque la regla aplicada, su origen (`general` u `override`) y las etiquetas necesarias para resumen y detalle
- [x] 1.4 Persistir en contraofertas los cambios de cantidad, tipo, cromos exactos y nota opcional
- [x] 1.5 Implementar lectura de borrador existente para reanudar el wizard en una sesion abierta

## 2. Shell del wizard mobile

- [x] 2.1 Crear la shell del wizard en el flujo publico de `/cambio/[token]` con progreso visible y navegacion de 4 pasos
- [x] 2.2 Implementar resumen sticky mobile con conteo de cromos seleccionados y estado parcial de la propuesta
- [x] 2.3 Mantener transiciones entre pasos sin perder seleccion ni decisiones al volver atras

## 3. Paso 1: seleccion de cromos del coleccionista

- [x] 3.1 Cargar en el paso 1 los cromos que el coleccionista quiere recibir para la sesion activa
- [x] 3.2 Implementar filtros por seleccion o pais, tipo de cromo y busqueda por numero o codigo
- [x] 3.3 Permitir seleccionar una sola unidad por cromo sin pedir cantidad

## 4. Paso 1 y paso 2: reglas y decision por bloque

- [x] 4.1 Resolver para cada cromo seleccionado si aplica override por cromo o regla general
- [x] 4.2 Mostrar la condicion resuelta con copy natural, por ejemplo `Se cambia por 2 cromos de jugador` o `Se cambia por 1 badge o por POR-15`, colapsando reglas equivalentes a `cualquier tipo de cromo`
- [x] 4.3 Implementar en la fila del paso 1 la decision por bloque, asumiendo `Aceptar la regla` por defecto y mostrando solo `Proponer otra opcion` o `Quitar contraoferta`
- [x] 4.4 Permitir propuestas mixtas dentro de una misma sesion sin afectar otros bloques al cambiar una decision

## 5. Paso 3: editor de contraofertas

- [x] 5.1 Implementar cumplimiento abstracto para bloques en modo `fulfill` sin exigir cromos exactos
- [x] 5.2 Implementar formulario de contraoferta por bloque con cambio de cantidad y tipo
- [x] 5.3 Permitir contraoferta con uno o mas cromos exactos cuando el bloque no cumple la regla
- [x] 5.4 Mostrar y guardar nota opcional solo para bloques en modo `counteroffer`

## 6. Paso 3, paso 4, envio y detalle posterior

- [x] 6.1 Construir resumen final priorizando visualmente lo que recibe el coleccionista
- [x] 6.2 Mostrar por bloque las etiquetas `Acepta la regla` y `Propone otra opcion`, dejando la condicion de intercambio en copy natural
- [x] 6.3 Implementar envio final de propuesta con estado `Pendiente de aprobacion`
- [x] 6.4 Implementar la vista detallada posterior al envio con todos los bloques y notas de contraoferta

## 7. Verificacion

- [x] 7.1 Cubrir con tests los escenarios clave del wizard: reanudacion, filtros, seleccion, overrides, propuesta mixta y envio pendiente
- [x] 7.2 Cubrir con tests el cumplimiento abstracto frente a contraofertas explicitas por cromo
- [x] 7.3 Correr `pnpm lint`
- [x] 7.4 Correr `pnpm build`

## 8. Paso 2: repetidos que quiere recibir el cambiador

- [x] 8.1 Extender el modelo de propuesta para persistir una lista global de repetidos solicitados por el cambiador con `stickerCode` y `quantity`
- [x] 8.2 Cargar en el paso 2 los repetidos reales del coleccionista usando solo cromos con cantidad disponible `> 0`
- [x] 8.3 Permitir seleccionar un repetido con cantidad inicial `1` y ajustar la cantidad hasta el maximo disponible
- [x] 8.4 Mantener esta lista independiente de los bloques por cromo ofrecido y persistirla en el borrador de sesion
- [x] 8.5 Mantener el wizard en 4 pasos y dedicar el paso 2 a los repetidos deseados y a la decision por bloque
- [x] 8.6 Mostrar en el resumen final la lista global de repetidos que recibe el cambiador
- [x] 8.7 Cubrir con tests la seleccion y cantidad de repetidos solicitados y correr `pnpm lint` + `pnpm build`

## 9. Semantica OR en el flujo publico

- [x] 9.1 Mostrar la regla del paso 1 como lista de opciones alternativas y no como suma acumulativa
- [x] 9.2 Ajustar el copy del wizard a `Acepta la regla` y `Propone otra opcion`
- [x] 9.3 Mantener el resumen final coherente con la semantica OR y validarlo con tests

## 10. Validacion de cromos exactos opcionales contra repetidos

- [x] 10.1 Validar en server-side que todos los `counteroffer.exactStickerCodes` existan entre los repetidos del coleccionista
- [x] 10.2 Bloquear el avance al siguiente paso del wizard cuando algun cromo exacto opcional no este entre los repetidos
- [x] 10.3 Reutilizar la misma validacion al enviar la propuesta final
- [x] 10.4 Mostrar un error explicito con el codigo invalido cuando falle la validacion
- [x] 10.5 Cubrir con tests el caso valido `POR-15, ARG-7`, el caso invalido y la revalidacion al enviar
