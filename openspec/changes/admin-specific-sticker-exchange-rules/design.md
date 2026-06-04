## Context

`/admin/intercambio` ya permite configurar reglas globales y un override por cromo limitado a una regla abstracta. El producto quiere soportar combinaciones como `cambio a Cristiano Ronaldo por Messi o por un Badge`, lo que exige ampliar el override para combinar un componente abstracto con un componente exacto que apunte a un cromo especifico. A la vez, `/admin/cromos` debe quedar enfocado exclusivamente en el inventario de repetidos: cantidad por cromo, sin configuracion de intercambio embebida en la grilla.

La spec `admin-cromos-repetidos-inventario` provee el contrato `isStickerMissingForAdmin` que este change consume para validar el componente exacto. La importacion es directa desde `src/lib/missing.ts` para desacoplar al consumidor del store y permitir reemplazar la implementacion sin propagar cambios.

El flujo publico del cambiador (`/cambio/[token]`) ya esta alineado con overrides por cromo y con propuestas mixtas por bloques. Este change entrega un resolvedor que devuelve una composicion de componentes para alimentar ese flujo sin redefinir el wizard. Ademas, si al envio una propuesta incluye un cromo exacto que ya no es faltante, la propuesta se persiste como `rechazada automaticamente`.

## Goals / Non-Goals

**Goals:**
- Modelar el override por cromo como `{ abstract: ExchangeRule | null, exact: { stickerCode: string } | null }`.
- Tratar el componente abstracto con todos los `OfferType` en `0` como desactivado.
- Resolver la regla aplicable como una lista ordenada de componentes: abstracto antes que exacto.
- Exponer la composicion al flujo publico con etiquetas `Regla especial por tipo` y `Regla especial por cromo`.
- Mantener formato antiguo en disco: leer como `{ abstract, exact: null }` y escribir siempre el nuevo formato.
- Limpiar el override completo con un toggle unico `Usar regla general`; si ambos componentes quedan vacios, eliminar el override del documento.
- Mantener `/admin/cromos` como surface exclusiva de inventario de repetidos, sin controles ni preview de reglas de intercambio.
- Importar `isStickerMissingForAdmin` directamente desde `src/lib/missing.ts` para validar el componente exacto al guardar.
- Persistir la propuesta como `rechazada automaticamente` si al envio incluye un cromo exacto que ya no es faltante.

**Non-Goals:**
- Implementar la spec de inventario de cromos faltantes del admin.
- Permitir varios cromos exactos en el mismo override.
- Combinar cantidades abstractas con cantidades exactas en el mismo override.
- Cambiar el formato del QR, la sesion del cambiador o el wizard mobile.
- Aprobar o rechazar propuestas desde admin en este change.

## Decisions

### 1) Override por cromo con dos componentes independientes
- **Decision:** modelar el override como `{ abstract: ExchangeRule | null, exact: { stickerCode: string } | null }`. Ambos son opcionales; el override existe si al menos uno es distinto de `null`.
- **Rationale:** refleja la intencion del producto y permite acumular componentes sin acoplar sus formas.
- **Alternatives considered:**
  - Union discriminada `mode: "abstract" | "exact"`: descartada por impedir acumulacion.
  - Campo paralelo `exact` sobre el modelo anterior: descartada por ambiguedad semantica.

### 2) Compatibilidad con overrides antiguos
- **Decision:** leer overrides antiguos como `{ abstract: <rule>, exact: null }` y persistir siempre en el nuevo formato.
- **Rationale:** evita migracion destructiva y mantiene comportamiento para admins con overrides abstractos.
- **Alternatives considered:**
  - Migracion one-shot: descartada por complejidad innecesaria.

### 3) `0` desactiva el componente abstracto
- **Decision:** tratar todos los `OfferType` del componente abstracto en `0` como componente desactivado. El override sigue activo si hay exacto.
- **Rationale:** ofrece una forma reversible de quitar la parte abstracta sin borrar el override.
- **Alternatives considered:**
  - Usar `null` para desactivar: descartada por colision con "no hay override".
  - Eliminar el override cuando el abstracto esta en `0`: descartada por perder el exacto.

### 4) Resolucion como lista ordenada de componentes
- **Decision:** el resolvedor devuelve `{ source: "global", components: [] }` o `{ source: "override", components: ResolvedComponent[] }`, donde el orden es abstracto antes que exacto.
- **Rationale:** simplifica el render y la validacion en el flujo publico, que itera sobre componentes.
- **Alternatives considered:**
  - Objeto `{ abstract, exact }`: descartado por requerir ramas especiales al iterar.

### 5) Toggle unico de limpieza
- **Decision:** la UI admin expone un toggle unico `Usar regla general` que vacia ambos componentes; si ambos quedan vacios, el override se elimina del documento.
- **Rationale:** coincide con la idea de un unico destino de "sin override" y evita acciones intermedias redundantes.
- **Alternatives considered:**
  - Boton por componente: descartado por duplicar controles y por acordar toggle unico.
  - Acciones `solo abstracto` / `solo exacto`: descartadas por sobreespecificar.

### 6) UI admin en la misma fila dentro de `/admin/intercambio`
- **Decision:** la edicion de ambos componentes se hace en la misma fila de la lista de cromos dentro de `/admin/intercambio`, con la misma pantalla en mobile. `/admin/cromos` no expone controles ni preview de intercambio por fila. El preview legible aparece solo al editar.
- **Rationale:** concentra las reglas de intercambio en una sola surface y deja el inventario de repetidos libre de ruido operativo.
- **Alternatives considered:**
  - Panel lateral al seleccionar el cromo: descartado por añadir un nivel extra innecesario.
  - Pantalla mobile separada: descartada por fragmentar la experiencia.

### 7) Valores globales visibles como base de edicion
- **Decision:** al abrir la edicion de un cromo sin override guardado, los campos del componente abstracto muestran como base visible los valores globales efectivos del tipo de ese cromo. El componente exacto sigue vacio si no existe.
- **Rationale:** evita que la fila parezca "todo en cero" cuando en realidad el cromo ya tiene una regla global aplicable, y mejora la orientacion visual del estado actual.
- **Alternatives considered:**
  - Mostrar inputs vacios o en `0` con texto auxiliar: descartado por menor claridad.

### 8) Validacion contra faltantes con importacion directa
- **Decision:** este change importa `isStickerMissingForAdmin` directamente desde `src/lib/missing.ts` para validar el componente exacto al guardar. No se redefine el contrato ni se crea una capa intermedia.
- **Rationale:** desacopla al consumidor del store concreto y permite reemplazar la implementacion sin propagar cambios.
- **Alternatives considered:**
  - Capa intermedia: descartada por valor anadido cero.
  - Acceso directo al store: descartado por acoplar a la persistencia.

### 9) Persistencia y limpieza
- **Decision:** cuando ambos componentes quedan vacios, el override se elimina del documento. Cuando solo uno queda vacio, se persiste como `null`. El `updatedAt` permanece solo en el documento.
- **Rationale:** evita estado ambiguo y mantiene la auditoria simple.
- **Alternatives considered:**
  - `updatedAt` por override: descartado por duplicar timestamps.

### 10) Rechazo automatico de propuestas con cromo exacto no faltante
- **Decision:** al enviar una propuesta, si algun cromo solicitado forma parte del componente exacto de un override y ya no es faltante, la propuesta SHALL persistirse con estado `rechazada automaticamente` y SHALL registrar el motivo para el admin. El cambiador SHALL ver la propuesta como no enviada.
- **Rationale:** protege al admin de intercambios fuera de su estado real y al cambiador de enviar propuestas que no se van a evaluar.
- **Alternatives considered:**
  - Bloquear envio con error: descartado por no reflejar la propuesta intentada.
  - Permitir envio y filtrar al aprobar: descartado por generar trabajo inutil.

## Risks / Trade-offs

- **[Riesgo] La spec de inventario de faltantes debe estar implementada antes de aplicar este change** -> **Mitigacion:** si no estuviera disponible, definir un stub fail-safe que devuelva `false` para cualquier cromo; el cambio sigue siendo consistente aunque deshabilita el componente exacto.
- **[Trade-off] Lista ordenada exige disciplina en el resolvedor para no invertir el orden** -> **Mitigacion:** tests explicitos del orden y un helper central para construir componentes.
- **[Riesgo] Toggle unico de limpieza puede borrar un exacto que el admin no queria perder** -> **Mitigacion:** confirmacion visible al activar `Usar regla general` y preview antes de guardar.
- **[Riesgo] Importacion directa acopla este change a `src/lib/missing.ts`** -> **Mitigacion:** el contrato esta definido como estable por la spec de faltantes; cualquier cambio alli obliga a actualizar consumidores.
- **[Trade-off] Rechazo automatico exige a la spec de aprobacion revalidar faltantes** -> **Mitigacion:** documentar el contrato y exponer un helper reusable desde la spec de faltantes.

## Migration Plan

1. Extender `src/lib/exchange-settings.ts` con `StickerOverride` que combine `abstract` opcional y `exact` opcional.
2. Actualizar `src/lib/exchange-settings-store.ts` para leer formato antiguo como `{ abstract, exact: null }` y persistir el nuevo formato.
3. Importar `isStickerMissingForAdmin` desde `src/lib/missing.ts` para validar el componente exacto al guardar.
4. Implementar Server Actions para guardar override por cromo y para activar el toggle `Usar regla general`.
5. Implementar el resolvedor que devuelve la lista ordenada de componentes con etiquetas.
6. Simplificar `/admin/cromos` para dejar solo cantidades de repetidos.
7. Extender la UI de `/admin/intercambio` para editar ambos componentes en la misma fila, mostrando los valores globales efectivos como base visual y preview solo al editar.
8. Integrar el rechazo automatico en el envio de propuestas cuando un cromo exacto ya no es faltante.
9. Cubrir con tests: lectura tolerante, persistencia, toggle de limpieza, orden de componentes, validacion de faltantes y rechazo automatico.
10. Despliegue no destructivo; rollback consiste en volver al modelo anterior y dejar de exponer el componente exacto.

## Open Questions

- La spec futura de aprobacion de propuestas debera revalidar faltantes al aprobar y persistir `rechazada automaticamente` si el estado cambio desde el envio.
- Queda por definir si conviene normalizar en disco un abstracto que el admin guarda identico a la regla global visible, para evitar duplicacion redundante.
