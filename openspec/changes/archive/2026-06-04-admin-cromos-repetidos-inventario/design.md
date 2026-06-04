## Context

El admin ya cuenta con un panel de gestion de cromos repetidos en `/admin/cromos`, pero no existe un inventario explicito de cromos faltantes. La spec `admin-specific-sticker-exchange-rules` depende de una fuente confiable de faltantes para validar el componente exacto del override, y el flujo publico del cambiador necesita saber que cromos quiere recibir el coleccionista para mostrar el primer paso del wizard y para impedir el envio de propuestas con cromos que ya no son faltantes.

El catalogo del album 2026 ya esta modelado en `src/lib/album-catalog.ts` con 980 cromos, por lo que el inventario de faltantes reutiliza ese origen para validar pertenencia y para construir la vista de album completo. El patron de UI, Server Actions y repositorio JSON swappable ya esta asentado en `/admin/cromos`, asi que esta spec lo replica con una vista de album completo y marcado masivo.

El cierre automatico al aprobar propuestas queda como hook documentado y consumible desde una sola llamada con la lista completa de cromos. La decision de no cachear el set de faltantes en esta spec mantiene la fuente de verdad siempre en el store y evita desfaces con el flujo publico.

## Goals / Non-Goals

**Goals:**
- Exponer una nueva ruta `/admin/cromos/faltantes` con vista de album completo, agrupada por seleccion y numeracion, ordenada con los faltantes primero.
- Validar que cada cromo marcado pertenezca al catalogo del album 2026.
- Persistir el inventario en un repositorio JSON swappable por `ownerEmail`, separado del de repetidos, con `updatedAt` solo en el documento y seed en disco.
- Permitir marcado y desmarcado individual y masivo desde la vista de album completo.
- Exponer el contrato `isStickerMissingForAdmin(ownerEmail, stickerCode)` para uso directo desde la spec de overrides exactos.
- Exponer el hook `markStickersAsCompletedForAdmin(ownerEmail, stickerCodes[])` con lista completa, consumible por la spec futura de aprobacion de propuestas.
- Persistir propuestas como `rechazada automaticamente` con motivo visible para el admin si al envio o aprobacion incluyen un cromo que ya no es faltante.
- Permitir al admin volver a marcar como faltante cualquier cromo, incluso despues de completado.
- Permitir al admin `vaciar inventario de faltantes` con confirmacion explicita.
- Mostrar `alert` en la card de un cromo que sea tambien repetido.
- Reusar la UX mobile/desktop del panel admin y los tokens del design system.

**Non-Goals:**
- Implementar la UI o logica de aprobacion de propuestas del cambiador.
- Cachear el set de faltantes para el flujo publico.
- Cambiar el formato del QR o el flujo de generacion en `/admin`.
- Migrar el inventario de repetidos actual; ambos repositorios conviven.
- Inventariar cromos que no pertenezcan al catalogo del album 2026.
- Mantener historial de cambios de estado de los cromos.

## Decisions

### 1) Repositorio separado del de repetidos
- **Decision:** crear un nuevo repositorio `src/lib/missing-store.ts` con documento `{ ownerEmail, updatedAt, items: { stickerCode: true } }`, seed en disco y persistencia sparse.
- **Rationale:** mantiene separadas las dos fuentes y evita acoplar faltantes a cantidades o tipos de repetidos.
- **Alternatives considered:**
  - Extender el documento de repetidos: descartado por mezclar conceptos.

### 2) Validacion contra el catalogo
- **Decision:** validar cada `stickerCode` contra `getGroupStickers` o helpers equivalentes de `src/lib/album-catalog.ts` antes de persistir.
- **Rationale:** evita entradas invalidas y mantiene coherencia con la spec del album 2026.
- **Alternatives considered:**
  - Validacion solo en UI: insuficiente; el servidor debe ser la fuente de verdad.

### 3) Vista de album completo con orden faltantes primero
- **Decision:** la UI muestra los 980 cromos del album agrupados por seleccion y numeracion. Dentro de cada grupo, los cromos faltantes aparecen primero y los no faltantes despues.
- **Rationale:** permite al admin ver rapidamente lo que le falta y ofrece la vision completa del album como contexto.
- **Alternatives considered:**
  - Vista solo de faltantes: descartada por perder contexto de album completo.
  - Vista solo de grupo seleccionado: descartada por fragmentar el flujo.

### 4) Marcado individual y masivo
- **Decision:** soportar dos modos: toggle individual por cromo y seleccion multiple con accion masiva `Marcar como faltante` o `Desmarcar`.
- **Rationale:** el marcado masivo reduce friccion al iniciar el inventario y al hacer ajustes grandes.
- **Alternatives considered:**
  - Solo marcado individual: descartado por ser lento para albums grandes.

### 5) Sin cache, lectura siempre al store
- **Decision:** `isStickerMissingForAdmin` consulta el store en cada invocacion. No se cachea el set de faltantes en esta spec.
- **Rationale:** mantiene la fuente de verdad siempre sincronizada y evita desfaces cuando el admin marca o completa cromos.
- **Alternatives considered:**
  - Cachear por sesion: descartado por complejidad y desface potencial.

### 6) Importacion directa desde missing.ts
- **Decision:** `isStickerMissingForAdmin` y `markStickersAsCompletedForAdmin` viven en `src/lib/missing.ts` y se importan directamente desde la spec de overrides exactos y desde la spec futura de aprobacion.
- **Rationale:** desacopla a los consumidores del store concreto y permite reemplazar la implementacion sin propagar cambios.
- **Alternatives considered:**
  - Exponer el store directamente: descartado por acoplar a la persistencia.
  - Capa intermedia: descartada por valor anadido cero.

### 7) Hook con lista completa
- **Decision:** `markStickersAsCompletedForAdmin(ownerEmail, stickerCodes[])` recibe la lista completa de cromos a marcar como completados en una sola llamada.
- **Rationale:** evita N round-trips al cerrar propuesta y mantiene la operacion atomica desde el punto de vista del consumidor.
- **Alternatives considered:**
  - Una llamada por cromo: descartado por menor eficiencia y consistencia.

### 8) Rechazo automatico de propuestas con cromo no faltante
- **Decision:** al enviar una propuesta, si algun cromo solicitado ya no es faltante para el admin, la propuesta SHALL persistirse con estado `rechazada automaticamente` y SHALL registrar el motivo para el admin. El cambiador SHALL ver la propuesta como no enviada.
- **Rationale:** protege al admin de intercambios fuera de su estado real y al cambiador de enviar propuestas que no se van a evaluar.
- **Alternatives considered:**
  - Permitir envio y filtrar al aprobar: descartado por generar trabajo inutil al admin.
  - Bloquear envio con error: descartado por no reflejar la propuesta intentada.

### 9) Re-marcar como faltante permitido
- **Decision:** cualquier operacion que marque un cromo como faltante tiene el mismo efecto, sin importar su origen previo (manual, propuesta aprobada o hook de completado).
- **Rationale:** el inventario refleja el estado actual y debe poder corregirse facilmente.
- **Alternatives considered:**
  - Mantener historial: descartado por complejidad innecesaria.

### 10) `updatedAt` solo en el documento
- **Decision:** el documento lleva `updatedAt` una sola vez. Las entradas individuales no llevan timestamp propio.
- **Rationale:** coincide con el patron de `repeateds` y reduce tamano del documento.
- **Alternatives considered:**
  - `updatedAt` por cromo: descartado por inflar el documento.

### 11) Accion `vaciar inventario` con confirmacion
- **Decision:** la UI expone `Vaciar inventario de faltantes`, que pide confirmacion explicita antes de borrar todas las entradas.
- **Rationale:** protege al admin de un borrado accidental y le permite reiniciar el inventario.
- **Alternatives considered:**
  - Borrado inmediato: descartado por ser destructivo sin red de seguridad.

### 12) Aviso de solapamiento con repetidos
- **Decision:** cuando un cromo marcado como faltante tambien existe como repetido, la card muestra un `alert` visible con copy que explica el solapamiento.
- **Rationale:** el coleccionista puede tener repetidos de un cromo que aun no consigue; el sistema debe reflejarlo sin impedir la combinacion.
- **Alternatives considered:**
  - Bloquear combinacion: descartado por限制了 la flexibilidad.

### 13) Atajo admin para marcar como completado
- **Decision:** desde la vista de faltantes, el admin puede marcar un cromo como completado con un atajo visible. La accion SHALL pedir confirmacion.
- **Rationale:** refleja el caso real en el que el admin completa un cromo por fuera de la plataforma.
- **Alternatives considered:**
  - Atajo inmediato sin confirmacion: descartado por ser destructivo.

### 14) QR expone solo los faltantes
- **Decision:** el flujo publico consume `isStickerMissingForAdmin` para cada cromo y solo muestra los que devuelven `true`.
- **Rationale:** mantiene la oferta del QR alineada con el estado real del admin.
- **Alternatives considered:**
  - Exponer todos los cromos: descartado por inflar el QR con cromos no negociables.

## Risks / Trade-offs

- **[Riesgo] Sin cache, cada consulta al set de faltantes va al store** -> **Mitigacion:** la persistencia JSON es pequena y el catalogo es estatico; el costo es aceptable para esta version.
- **[Riesgo] Marcado masivo puede ser destructivo si se aplica a todo el album por error** -> **Mitigacion:** confirmacion previa al aplicar accion masiva y preview del alcance.
- **[Trade-off] Rechazo automatico de propuestas exige a la spec de aprobacion validar el set de faltantes en ese momento** -> **Mitigacion:** documentar el contrato y exponer un helper reusable.
- **[Riesgo] Aviso de solapamiento puede anadir ruido visual en el album completo** -> **Mitigacion:** usar `alert` discreto con icono, copy corto y solo cuando hay solapamiento.
- **[Riesgo] `vaciar inventario` es destructivo** -> **Mitigacion:** confirmacion explicita con copy que advierta el efecto.
- **[Trade-off] Atajo `marcar como completado` con confirmacion anade un paso** -> **Mitigacion:** usar el patron de dialogo ya conocido en el design system.

## Migration Plan

1. Crear `src/lib/missing.ts` con tipos Zod y funciones `isStickerMissingForAdmin`, `markStickersAsCompletedForAdmin` y helper `clearMissingInventoryForAdmin`.
2. Crear `src/lib/missing-store.ts` con lectura/escritura del documento JSON swappable y seed en disco vacio.
3. Crear `src/app/admin/cromos/faltantes/page.tsx` con autenticacion, carga del inventario y vista de album completo.
4. Crear Server Actions para marcar/desmarcar individual, marcado masivo y vaciar inventario con confirmacion.
5. Crear componentes de UI para la vista de album completo con `alert` de solapamiento y atajo de completado con confirmacion.
6. Enlazar la nueva ruta desde `/admin` y desde `/admin/cromos`.
7. Cubrir con tests: validacion de catalogo, persistencia sparse, marcado masivo, contratos, rechazo automatico, vaciado y re-marcacion.
8. Despliegue no destructivo; el repositorio se auto-seedea con un documento vacio al primer acceso.

## Open Questions

- La spec futura de aprobacion de propuestas debera invocar `markStickersAsCompletedForAdmin` con la lista completa al aprobar y persistir `rechazada automaticamente` si algun cromo dejo de ser faltante.
- Queda por definir si la vista de album completo debe permitir filtrar por seleccion o tipo para aliviar la densidad visual en mobile.
