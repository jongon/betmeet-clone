## 1. Modelo de propuesta y persistencia

- [ ] 1.1 Extender el modelo de sesion publica del cambiador para guardar un borrador de propuesta por cromo y el estado final `pending`
- [ ] 1.2 Definir la estructura de bloque independiente por cromo con modo `fulfill` o `counteroffer`
- [ ] 1.3 Persistir por bloque la regla aplicada, su origen (`general` u `override`) y las etiquetas necesarias para resumen y detalle
- [ ] 1.4 Persistir en contraofertas los cambios de cantidad, tipo, cromos exactos y nota opcional
- [ ] 1.5 Implementar lectura de borrador existente para reanudar el wizard en una sesion abierta

## 2. Shell del wizard mobile

- [ ] 2.1 Crear la shell del wizard en el flujo publico de `/cambio/[token]` con progreso visible y navegacion de 5 pasos
- [ ] 2.2 Implementar resumen sticky mobile con conteo de cromos seleccionados y estado parcial de la propuesta
- [ ] 2.3 Mantener transiciones entre pasos sin perder seleccion ni decisiones al volver atras

## 3. Paso 1: seleccion de cromos del coleccionista

- [ ] 3.1 Cargar en el paso 1 los cromos que el coleccionista quiere recibir para la sesion activa
- [ ] 3.2 Implementar filtros por seleccion o pais, tipo de cromo y busqueda por numero o codigo
- [ ] 3.3 Permitir seleccionar una sola unidad por cromo sin pedir cantidad

## 4. Paso 2 y paso 3: reglas y decision por bloque

- [ ] 4.1 Resolver para cada cromo seleccionado si aplica override por cromo o regla general
- [ ] 4.2 Mostrar etiquetas `Regla especial` y `Regla general` segun la regla aplicada
- [ ] 4.3 Implementar el paso 3 para decidir por bloque entre `Cumplir regla` y `Proponer contraoferta`
- [ ] 4.4 Permitir propuestas mixtas dentro de una misma sesion sin afectar otros bloques al cambiar una decision

## 5. Paso 4: editor de contraofertas

- [ ] 5.1 Implementar cumplimiento abstracto para bloques en modo `fulfill` sin exigir cromos exactos
- [ ] 5.2 Implementar formulario de contraoferta por bloque con cambio de cantidad y tipo
- [ ] 5.3 Permitir contraoferta con uno o mas cromos exactos cuando el bloque no cumple la regla
- [ ] 5.4 Mostrar y guardar nota opcional solo para bloques en modo `counteroffer`

## 6. Paso 5, envio y detalle posterior

- [ ] 6.1 Construir resumen final priorizando visualmente lo que recibe el coleccionista
- [ ] 6.2 Mostrar por bloque las etiquetas `Cumple regla`, `Contraoferta`, `Regla general` y `Regla especial`
- [ ] 6.3 Implementar envio final de propuesta con estado `Pendiente de aprobacion`
- [ ] 6.4 Implementar la vista detallada posterior al envio con todos los bloques y notas de contraoferta

## 7. Verificacion

- [ ] 7.1 Cubrir con tests los escenarios clave del wizard: reanudacion, filtros, seleccion, overrides, propuesta mixta y envio pendiente
- [ ] 7.2 Cubrir con tests el cumplimiento abstracto frente a contraofertas explicitas por cromo
- [ ] 7.3 Correr `pnpm lint`
- [ ] 7.4 Correr `pnpm build`
