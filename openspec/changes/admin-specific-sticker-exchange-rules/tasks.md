## 1. Modelo de override por cromo

- [ ] 1.1 Extender `src/lib/exchange-settings.ts` con `StickerOverride` que combine `abstract` opcional y `exact` opcional
- [ ] 1.2 Actualizar `ExchangeSettingsDocument` para persistir `overrides` en la nueva estructura `{ abstract, exact }`
- [ ] 1.3 Aceptar el valor `0` en todos los `OfferType` del componente abstracto como forma valida de desactivarlo

## 2. Persistencia y compatibilidad

- [ ] 2.1 Implementar lectura tolerante en `src/lib/exchange-settings-store.ts` que convierta overrides antiguos a `{ abstract, exact: null }`
- [ ] 2.2 Implementar escritura que siempre guarde overrides en el nuevo formato
- [ ] 2.3 Cubrir con tests la lectura de overrides antiguos y la persistencia del nuevo formato

## 3. Validacion contra inventario de faltantes

- [ ] 3.1 Importar `isStickerMissingForAdmin` desde `src/lib/missing.ts` para validar el componente exacto al guardar
- [ ] 3.2 Definir un stub fail-safe en `src/lib/missing.ts` que devuelva `false` por defecto si la spec de faltantes no esta implementada
- [ ] 3.3 Cubrir con tests el rechazo por defecto y la aceptacion cuando `isStickerMissingForAdmin` responde `true`

## 4. Resolvedor para el flujo publico

- [ ] 4.1 Implementar resolvedor que devuelve `{ source, components }` con la lista ordenada de componentes
- [ ] 4.2 Garantizar que el componente abstracto aparece antes que el exacto cuando ambos estan activos
- [ ] 4.3 Tratar una lista vacia con `source: "override"` como `source: "global"`
- [ ] 4.4 Cubrir con tests la composicion para cromo con abstract, con exact, con ambos y sin override

## 5. Server Actions y UI admin

- [ ] 5.1 Crear Server Action para guardar override por cromo con sus dos componentes opcionales
- [ ] 5.2 Crear Server Action para activar el toggle unico `Usar regla general` y eliminar el override si ambos componentes quedan vacios
- [ ] 5.3 Extender la UI de `/admin/intercambio` para editar ambos componentes en la misma fila de la lista de cromos
- [ ] 5.4 Mostrar el preview legible solo al editar, con etiquetas `Regla especial por tipo` y `Regla especial por cromo`
- [ ] 5.5 Garantizar la misma experiencia en mobile sin pantalla adicional

## 6. Rechazo automatico de propuestas

- [ ] 6.1 Consultar `isStickerMissingForAdmin` al enviar una propuesta para cada cromo solicitado
- [ ] 6.2 Persistir la propuesta como `rechazada automaticamente` cuando un cromo exacto ya no es faltante
- [ ] 6.3 Registrar el motivo del rechazo para que el admin lo vea
- [ ] 6.4 Cubrir con tests el escenario de rechazo automatico y el camino feliz de propuesta pendiente

## 7. Verificacion

- [ ] 7.1 Cubrir con tests la lectura tolerante, la persistencia del nuevo formato y el toggle unico
- [ ] 7.2 Cubrir con tests el orden de los componentes y la composicion servida al flujo publico
- [ ] 7.3 Correr `pnpm lint`
- [ ] 7.4 Correr `pnpm build`
