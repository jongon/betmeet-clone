## 1. Modelo de override por cromo

- [x] 1.1 Extender `src/lib/exchange-settings.ts` con `StickerOverride` que combine `abstract` opcional y `exact` opcional
- [x] 1.2 Actualizar `ExchangeSettingsDocument` para persistir `overrides` en la nueva estructura `{ abstract, exact }`
- [x] 1.3 Aceptar el valor `0` en todos los `OfferType` del componente abstracto como forma valida de desactivarlo

## 2. Persistencia y compatibilidad

- [x] 2.1 Implementar lectura tolerante en `src/lib/exchange-settings-store.ts` que convierta overrides antiguos a `{ abstract, exact: null }`
- [x] 2.2 Implementar escritura que siempre guarde overrides en el nuevo formato
- [x] 2.3 Cubrir con tests la lectura de overrides antiguos y la persistencia del nuevo formato

## 3. Validacion contra inventario de faltantes

- [x] 3.1 Importar `isStickerMissingForAdmin` desde `src/lib/missing.ts` para validar el componente exacto al guardar
- [x] 3.2 Definir un stub fail-safe en `src/lib/missing.ts` que devuelva `false` por defecto si la spec de faltantes no esta implementada
- [x] 3.3 Cubrir con tests el rechazo por defecto y la aceptacion cuando `isStickerMissingForAdmin` responde `true`

## 4. Resolvedor para el flujo publico

- [x] 4.1 Implementar resolvedor que devuelve `{ source, components }` con la lista ordenada de componentes
- [x] 4.2 Garantizar que el componente abstracto aparece antes que el exacto cuando ambos estan activos
- [x] 4.3 Tratar una lista vacia con `source: "override"` como `source: "global"`
- [x] 4.4 Cubrir con tests la composicion para cromo con abstract, con exact, con ambos y sin override

## 5. Server Actions y UI admin

- [x] 5.1 Crear Server Action para guardar override por cromo con sus dos componentes opcionales
- [x] 5.2 Crear Server Action para activar el toggle unico `Usar regla general` y eliminar el override si ambos componentes quedan vacios
- [x] 5.3 Simplificar `/admin/cromos` para dejar solo cantidades de repetidos
- [x] 5.4 Extender la UI de `/admin/intercambio` para editar ambos componentes en la misma fila de la lista de cromos
- [x] 5.5 Mostrar en cada fila los valores globales efectivos como base visible al editar, sin arrancar en `0` cuando no hay override
- [x] 5.6 Mostrar el preview legible solo al editar, con etiquetas `Regla especial por tipo` y `Regla especial por cromo`
- [x] 5.7 Garantizar la misma experiencia en mobile sin pantalla adicional

## 6. Validacion de propuestas contra faltantes vigentes

- [x] 6.1 Consultar el estado de faltantes al enviar una propuesta para cada cromo solicitado
- [x] 6.2 Interrumpir el envio cuando un cromo solicitado ya no es faltante y devolver un motivo explicito al cambiador
- [x] 6.3 Evitar persistir la propuesta como pendiente cuando la validacion falla
- [x] 6.4 Cubrir con tests la validacion contra faltantes y el camino feliz de propuesta pendiente

## 7. Verificacion

- [x] 7.1 Cubrir con tests la lectura tolerante, la persistencia del nuevo formato y el toggle unico
- [x] 7.2 Cubrir con tests el orden de los componentes y la composicion servida al flujo publico
- [x] 7.3 Correr `pnpm lint`
- [x] 7.4 Correr `pnpm build`

## 8. Semantica OR de intercambio

- [x] 8.1 Expresar en admin que cada `OfferType` activo del componente abstracto es una opcion alternativa `OR`
- [x] 8.2 Ajustar el preview de `/admin/intercambio` para listar opciones separadas por `o`
- [x] 8.3 Cubrir con tests el formateo legible de opciones de intercambio
