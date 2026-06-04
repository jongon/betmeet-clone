## 1. Modelo y repositorio de faltantes

- [ ] 1.1 Crear `src/lib/missing.ts` con tipos Zod y funciones `isStickerMissingForAdmin`, `markStickersAsCompletedForAdmin` y `clearMissingInventoryForAdmin`
- [ ] 1.2 Crear `src/lib/missing-store.ts` con lectura/escritura del documento JSON swappable, persistencia sparse y auto-seed en disco vacio
- [ ] 1.3 Implementar validacion contra el catalogo del album 2026 en el store y en el modulo `missing.ts`
- [ ] 1.4 Cubrir con tests la lectura, escritura, normalizacion sparse y validacion de catalogo

## 2. Contratos publicos

- [ ] 2.1 Implementar `isStickerMissingForAdmin` con lectura directa al store en cada invocacion
- [ ] 2.2 Implementar `markStickersAsCompletedForAdmin` con lista completa, idempotencia y actualizacion de `updatedAt` solo si hay cambios
- [ ] 2.3 Implementar `clearMissingInventoryForAdmin` para vaciar el inventario
- [ ] 2.4 Cubrir con tests los tres contratos y la firma consumible por la spec de overrides exactos

## 3. Ruta /admin/cromos/faltantes

- [ ] 3.1 Crear `src/app/admin/cromos/faltantes/page.tsx` con autenticacion y carga del inventario
- [ ] 3.2 Renderizar vista de album completo agrupada por seleccion y numeracion
- [ ] 3.3 Ordenar los cromos de cada grupo con los faltantes primero
- [ ] 3.4 Enlazar la nueva ruta desde `/admin` y desde `/admin/cromos`

## 4. Server Actions y UI

- [ ] 4.1 Crear Server Action para marcar y desmarcar un cromo individual
- [ ] 4.2 Crear Server Action para marcado masivo con seleccion multiple y confirmacion
- [ ] 4.3 Crear Server Action para vaciar inventario con confirmacion
- [ ] 4.4 Crear Server Action para atajo `Marcar como completado` con confirmacion
- [ ] 4.5 Implementar `alert` de solapamiento con repetidos en la card del cromo
- [ ] 4.6 Revalidar `/admin/cromos/faltantes` al finalizar cada accion

## 5. Compatibilidad con repetidos

- [ ] 5.1 Garantizar que un cromo puede ser faltante y repetido al mismo tiempo
- [ ] 5.2 Cubrir con tests la independencia entre ambos repositorios

## 6. Contrato con specs consumidoras

- [ ] 6.1 Documentar el consumo por parte de `admin-specific-sticker-exchange-rules` para validar el componente exacto
- [ ] 6.2 Documentar el contrato de rechazo automatico para la spec futura de aprobacion de propuestas
- [ ] 6.3 Cubrir con tests el escenario de propuesta con cromo no faltante que termina como `rechazada automaticamente`

## 7. Verificacion

- [ ] 7.1 Correr `pnpm lint`
- [ ] 7.2 Correr `pnpm build`
- [ ] 7.3 Cubrir con tests el marcado masivo, el vaciado con confirmacion y el atajo de completado
