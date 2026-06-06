## Context

La propuesta pendiente ya modela dos caras del intercambio:

- `proposal.blocks[].requestedStickerCode` representa los cromos que recibe el coleccionista.
- `proposal.requestedRepeateds[]` representa los repetidos que recibe el cambiador.

Sin embargo, la aceptacion actual en admin interpreta la accion solo como cierre de sesion. No existe una operacion de dominio que consuma la propuesta sobre los inventarios actuales del admin.

El producto necesita otra semantica:

```text
aceptar propuesta valida
  -> aplicar intercambio a inventarios
  -> cerrar sesion

aceptar propuesta inconsistente
  -> rechazar la aceptacion
  -> cerrar sesion
  -> no tocar inventarios
```

## Goals / Non-Goals

**Goals**
- Validar la propuesta pendiente contra inventario actual justo antes de aceptarla.
- Desmarcar faltantes recibidos y descontar repetidos entregados cuando la propuesta sigue siendo valida.
- Cerrar la sesion sin aplicar inventario cuando la propuesta ya no es aceptable.
- Evitar dobles descuentos sobre sesiones ya cerradas.

**Non-Goals**
- Introducir un nuevo estado persistido distinto de `open/closed` en esta change.
- Rediseñar la UI del detalle admin.
- Cambiar el modelo de propuesta del cambiador.

## Decisions

### 1) Aceptar requiere propuesta pendiente valida
- **Decision:** la operacion de aceptar SHALL ejecutarse solo si la sesion esta `open`, tiene `proposal`, y `proposal.status === "pending"`.
- **Rationale:** evita cerrar como aceptadas sesiones sin una propuesta finalizable.

### 2) Revalidar faltantes y repetidos justo antes de aceptar
- **Decision:** antes de mutar nada, el sistema relee el inventario actual del admin y valida:
  - que todos los `requestedStickerCode` de `proposal.blocks` sigan marcados como faltantes
  - que cada `requestedRepeateds[].quantity` siga disponible en repetidos
- **Rationale:** la propuesta puede haber quedado desfasada desde que el cambiador la envio.

### 3) Inconsistencia rechaza la aceptacion y cierra la sesion
- **Decision:** si la validacion previa falla por faltantes o repetidos, el sistema SHALL cerrar la sesion sin descontar inventario.
- **Rationale:** el usuario pidio que la aceptacion no continúe y que la sesion no quede reintentable.

### 4) Idempotencia sobre sesiones cerradas
- **Decision:** si la operacion recibe una sesion ya `closed`, SHALL comportarse como no-op y SHALL no volver a descontar inventario.
- **Rationale:** protege de dobles clicks, reintentos y revalidaciones de UI.

### 5) Operacion de dominio unica para aplicar la aceptacion
- **Decision:** la implementacion SHOULD concentrar la logica en una sola operacion semantica tipo `acceptPendingSessionForAdmin(sessionId, ownerEmail)` en lugar de repartirla entre varias capas de UI.
- **Rationale:** facilita pruebas, reuso y razonamiento sobre validacion + consumo + cierre.

## Risks / Trade-offs

- **Riesgo:** los repositorios actuales viven en archivos JSON separados (`sessions`, `missing`, `repeateds`) sin transaccion real.
- **Mitigacion:** validar todo antes de mutar, centralizar la operacion, y ordenar las escrituras de forma consistente.

- **Trade-off:** esta change no introduce un estado persistido de "rechazada automaticamente al aceptar".
- **Mitigacion:** la sesion quedara cerrada y sin consumo de inventario; si mas adelante hace falta auditabilidad de causa, se podra extender el modelo.

## Suggested Flow

```text
admin confirma aceptar
        │
        ▼
cargar sesion abierta + propuesta pending
        │
        ▼
releer inventario actual
        │
        ├─ faltante ausente o repetido insuficiente
        │      -> cerrar sesion
        │      -> no aplicar inventario
        │
        └─ propuesta vigente
               -> quitar faltantes recibidos
               -> descontar repetidos solicitados
               -> cerrar sesion
```

## Open Questions

- Si mas adelante se necesita distinguir visualmente una sesion aceptada de una cerrada por inconsistencia, hara falta ampliar el modelo con una decision persistida o motivo.
