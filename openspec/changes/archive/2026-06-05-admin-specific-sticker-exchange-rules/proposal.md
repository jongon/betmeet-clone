## Why

El admin puede definir reglas globales y overrides por cromo, pero el override solo admite reglas abstractas. Para reflejar casos reales como `cambio a Cristiano Ronaldo por Messi o por un Badge`, el override por cromo debe permitir combinar un componente abstracto con un componente exacto validado contra el inventario de faltantes, y debe respetar la decision del admin de cerrar propuestas cuando un cromo exacto deja de ser faltante.

## What Changes

- Evolucionar el override por cromo para soportar dos componentes independientes: abstracto opcional y exacto opcional.
- Expresar el componente abstracto como un conjunto de opciones alternativas `OR`, tanto en admin como en el flujo publico.
- Aceptar `0` como valor valido en el componente abstracto y tratarlo como desactivado.
- Permitir que el componente exacto guarde un unico cromo especifico, validado contra `isStickerMissingForAdmin` importado directamente desde `src/lib/missing.ts`.
- Mantener formato antiguo en disco: leer overrides antiguos como override abstracto y escribir siempre el nuevo formato.
- Limpiar el override completo con un toggle unico `Usar regla general`.
- Resolver la regla aplicable como una lista ordenada de componentes, con abstracto antes que exacto.
- Exponer la composicion al flujo publico con etiquetas `Regla especial por tipo` y `Regla especial por cromo`.
- Hacer visible en admin que el cambiador puede cumplir cualquiera de las opciones activas del componente abstracto.
- Persistir la propuesta como `rechazada automaticamente` si al envio incluye un cromo exacto que ya no es faltante.
- Definir un stub vacio para `isStickerMissingForAdmin` solo si la spec de faltantes no estuviera implementada al aplicar este change.

## Capabilities

### New Capabilities

- `admin-specific-sticker-exchange-rules`: modelo, persistencia, UI y resolvedor de overrides por cromo con componentes abstracto y exacto combinables, validacion contra el inventario de faltantes y resolucion como lista ordenada para el flujo publico.

### Modified Capabilities

## Impact

- Frontend admin: `/admin/cromos` queda limitado al inventario de repetidos; la extension de reglas por cromo vive en `/admin/intercambio`, donde cada fila muestra los valores globales efectivos como base visual y el preview legible.
- Capa de reglas: evolucion del `StickerOverride` y del documento de settings persistido en `data/exchange-settings.json`.
- Resolvedor: nueva funcion que devuelve una lista ordenada de componentes para el flujo publico `/cambio/[token]`.
- Validacion: consumo directo de `isStickerMissingForAdmin` desde `src/lib/missing.ts`.
- Flujo publico: rechazo automatico de propuestas cuyo cromo exacto dejo de ser faltante; la spec publica sigue intacta en su contenido y solo consume el estado de la propuesta.
- Compatibilidad: lectura tolerante del formato antiguo sin migracion destructiva.
- Specs OpenSpec afectadas: nueva capability `admin-specific-sticker-exchange-rules`. La spec de inventario de faltantes se implementa antes en otro change.
