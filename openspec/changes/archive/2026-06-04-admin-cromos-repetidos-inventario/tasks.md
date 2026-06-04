## 1. Modelo y repositorio de faltantes

- [x] 1.1 Crear `src/lib/missing.ts` con tipos Zod y funciones `isStickerMissingForAdmin`, `markStickersAsCompletedForAdmin` y `clearMissingInventoryForAdmin`
- [x] 1.2 Crear `src/lib/missing-store.ts` con lectura/escritura del documento JSON swappable, persistencia sparse y auto-seed en disco vacio
- [x] 1.3 Implementar validacion contra el catalogo del album 2026 en el store y en el modulo `missing.ts`
- [x] 1.4 Cubrir con tests la lectura, escritura, normalizacion sparse y validacion de catalogo

## 2. Contratos publicos

- [x] 2.1 Implementar `isStickerMissingForAdmin` con lectura directa al store en cada invocacion
- [x] 2.2 Implementar `markStickersAsCompletedForAdmin` con lista completa, idempotencia y actualizacion de `updatedAt` solo si hay cambios
- [x] 2.3 Implementar `clearMissingInventoryForAdmin` para vaciar el inventario
- [x] 2.4 Cubrir con tests los tres contratos y la firma consumible por la spec de overrides exactos

## 3. Ruta /admin/cromos/faltantes

- [x] 3.1 Crear `src/app/admin/cromos/faltantes/page.tsx` con autenticacion y carga del inventario
- [x] 3.2 Renderizar vista de album completo agrupada por seleccion y numeracion
- [x] 3.3 Ordenar los cromos de cada grupo con los faltantes primero
- [x] 3.4 Enlazar la nueva ruta desde `/admin` y desde `/admin/cromos`

## 4. Server Actions y UI

- [x] 4.1 Crear Server Action para marcar y desmarcar un cromo individual
- [x] 4.2 Crear Server Action para marcado masivo con seleccion multiple y confirmacion
- [x] 4.3 Crear Server Action para vaciar inventario con confirmacion
- [x] 4.4 Crear Server Action para atajo `Marcar como completado` con confirmacion
- [x] 4.5 Implementar `alert` de solapamiento con repetidos en la card del cromo
- [x] 4.6 Revalidar `/admin/cromos/faltantes` al finalizar cada accion

## 5. Compatibilidad con repetidos

- [x] 5.1 Garantizar que un cromo puede ser faltante y repetido al mismo tiempo
- [x] 5.2 Cubrir con tests la independencia entre ambos repositorios

## 6. Contrato con specs consumidoras

- [x] 6.1 Documentar el consumo por parte de `admin-specific-sticker-exchange-rules` para validar el componente exacto
- [x] 6.2 Documentar el contrato de rechazo automatico para la spec futura de aprobacion de propuestas
- [x] 6.3 Cubrir con tests el escenario de propuesta con cromo no faltante que termina como `rechazada automaticamente`

## 7. Verificacion

- [x] 7.1 Correr `pnpm lint`
- [x] 7.2 Correr `pnpm build`
- [x] 7.3 Cubrir con tests el marcado masivo, el vaciado con confirmacion y el atajo de completado
