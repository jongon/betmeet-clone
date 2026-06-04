## Why

El admin ya gestiona cromos repetidos, pero no existe un inventario explicito de cromos faltantes. La spec `admin-specific-sticker-exchange-rules` necesita una fuente confiable de faltantes para validar overrides exactos, y el flujo publico del cambiador requiere saber que cromos quiere recibir el coleccionista. Sin un inventario de faltantes no podemos soportar correctamente el "cambio a Cristiano Ronaldo por Messi o por un Badge", ni el rechazo automatico de propuestas cuando un cromo negociado deja de ser faltante.

## What Changes

- Crear un inventario de cromos faltantes por admin en una nueva ruta `/admin/cromos/faltantes` con vista de album completo agrupado por seleccion y numeracion.
- Permitir al admin marcar y desmarcar cromos como faltantes de forma individual o masiva desde la vista de album completo.
- Persistir el inventario de faltantes en un repositorio JSON swappable por `ownerEmail`, separado del inventario de repetidos, con `updatedAt` solo en el documento.
- Exponer el contrato `isStickerMissingForAdmin(ownerEmail, stickerCode)` consumible por la spec `admin-specific-sticker-exchange-rules` y por el flujo publico, sin cache intermedio.
- Permitir al admin volver a marcar como faltante un cromo previamente completado, ya sea por propuesta aprobada o por el atajo manual.
- Exponer el hook `markStickersAsCompletedForAdmin(ownerEmail, stickerCodes[])` con lista completa, consumible por la spec futura de aprobacion de propuestas.
- Persistir la propuesta como `rechazada automaticamente` si al momento de envio o de aprobacion incluye un cromo que ya no es faltante, con motivo visible para el admin.
- Permitir al admin `vaciar inventario de faltantes` con confirmacion explicita.
- Mostrar `alert` en la card de un cromo que sea tambien repetido.
- Reusar la UX mobile/desktop del panel admin y los tokens del design system.

## Capabilities

### New Capabilities

- `admin-cromos-faltantes`: inventario de cromos faltantes del admin con alta/baja individual y masiva, validacion contra el catalogo del album 2026, persistencia sparse por propietario, contratos `isStickerMissingForAdmin` y `markStickersAsCompletedForAdmin`, y rechazo automatico de propuestas con cromo no faltante.

### Modified Capabilities

## Impact

- Frontend admin: nueva ruta `src/app/admin/cromos/faltantes/page.tsx` con vista de album completo, marcado masivo y atajo de completado.
- Capa de datos: nuevo repositorio en `src/lib/missing-store.ts` con documento `{ ownerEmail, updatedAt, items: { stickerCode: true } }` y seed en disco.
- API publica interna: nuevas funciones en `src/lib/missing.ts` con importacion directa por parte de la spec de overrides.
- Flujo de propuestas: hook consumido por la spec futura de aprobacion para rechazo automatico y marcado como completado en una sola llamada.
- Cierre de trato: la spec futura de aprobacion de propuestas invocara `markStickersAsCompletedForAdmin` con la lista completa de cromos recibidos.
- QR publico: expone unicamente los cromos actualmente faltantes; cualquier cambio se refleja al recargar la sesion.
- Specs OpenSpec afectadas: nueva capability `admin-cromos-faltantes`. Las specs `admin-specific-sticker-exchange-rules` y `mobile-exchange-proposal-flow` consumiran el contrato expuesto.
