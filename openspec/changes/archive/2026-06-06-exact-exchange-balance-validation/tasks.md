## 1. Validacion de reglas abstractas en admin

- [x] 1.1 Agregar al dominio de `exchange-settings` una validacion compartida que rechace reglas donde `ANY` sea menor que la cantidad maxima de `PLAYER`, `BADGE`, `TEAM_PHOTO` o `SPECIAL`
- [x] 1.2 Reutilizar esa validacion al guardar settings globales y overrides por cromo desde las server actions de admin
- [x] 1.3 Mostrar en `/admin/intercambio` un mensaje claro cuando falle la validacion de coherencia de `ANY`

## 2. Motor de unidades habilitadas para propuestas

- [x] 2.1 Implementar una utilidad compartida que calcule la capacidad de un bloque `fulfill` usando la mayor cantidad positiva de la regla aplicada
- [x] 2.2 Implementar una utilidad compartida que calcule la capacidad de un bloque `counteroffer` como suma de cantidades por tipo mas `1` por cada `exactStickerCode`
- [x] 2.3 Implementar una utilidad que calcule el balance global exacto comparando unidades habilitadas de bloques contra `requestedRepeateds`

## 3. Flujo publico: bloqueo de envio y guidance en paso 3

- [x] 3.1 Conectar el motor de balance al resumen del paso 3 para mostrar cuando faltan o sobran unidades antes de enviar
- [x] 3.2 Bloquear el boton de envio cuando el balance global exacto no coincida y devolver el mismo rechazo desde la server action de envio
- [x] 3.3 Permitir en el paso 3 ajustes ligeros sobre `requestedRepeateds` y una entrada clara para volver a editar bloques ofrecidos, sin cerrar aun la UX final del editor
- [x] 3.4 Recalcular el balance al rehidratar borradores existentes para que propuestas viejas muestren guidance antes del envio

## 5. Refinamiento UX del paso 3

- [x] 5.1 Reordenar el paso 3 para priorizar primero el bloque de balance, luego la guidance y despues el detalle editable del intercambio
- [x] 5.2 Diferenciar el copy guiado para los estados `faltan unidades`, `sobran unidades` y `balance exacto`
- [x] 5.3 Mantener la edicion inline solo para `requestedRepeateds` y mover `Editar oferta` a un drawer mobile por bloque
- [x] 5.4 Permitir en el drawer cambiar entre `Aceptar la regla` y `Proponer otra opcion`, mostrando la capacidad del bloque en vivo
- [x] 5.5 Pedir confirmacion ligera al volver de una contraoferta cargada a `Aceptar la regla`
- [x] 5.6 Al guardar el drawer, cerrar la edicion, recalcular el balance y devolver el foco visual al bloque de balance

## 4. Verificacion

- [x] 4.1 Cubrir con tests las reglas admin incoherentes donde `ANY` queda por debajo del maximo especifico
- [x] 4.2 Cubrir con tests el calculo de capacidad en `fulfill`, `counteroffer` y balance global exacto
- [x] 4.3 Cubrir con tests el bloqueo de envio cuando el cambiador pide menos o mas unidades de las habilitadas
- [x] 4.4 Correr `pnpm lint`
- [x] 4.5 Correr `pnpm build`
