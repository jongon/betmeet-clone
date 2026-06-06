## Context

El admin ya tiene un inbox funcional en `/admin` para ver sesiones, aceptarlas, rechazarlas o archivarlas, pero hoy la decisión se toma casi sin contexto: la fila solo muestra nombre del cambiador, conteos agregados y estado. La propuesta completa ya existe en persistencia (`proposal`, `blocks`, `requestedRepeateds`, notas y etiquetas), así que falta principalmente una surface administrativa dedicada para inspeccionarla antes de decidir.

La necesidad cruza tres zonas: la lista principal de sesiones, la lista de archivadas y una nueva ruta de detalle. Queremos mantener la velocidad del inbox con acciones rápidas, pero añadir una revisión profunda en una pantalla separada. Además, esa misma pantalla debe servir tanto para propuestas pendientes como para sesiones cerradas o archivadas en modo solo lectura.

## Goals / Non-Goals

**Goals:**
- Crear una ruta protegida de detalle de sesión propuesta en admin.
- Permitir revisar el balance, lo que recibe cada parte y el detalle por bloque antes de aprobar o rechazar.
- Mantener `Aceptar` y `Rechazar` rápidos en la lista de `/admin`.
- Añadir `Ver detalle` tanto en inbox como en archivadas.
- Mostrar CTA sticky en mobile cuando la sesión siga abierta y tenga propuesta pendiente.
- Usar la misma surface en modo solo lectura para sesiones cerradas o archivadas.

**Non-Goals:**
- Reemplazar por completo las acciones rápidas de la lista principal.
- Permitir editar la propuesta del cambiador desde admin.
- Cambiar el modelo de persistencia de sesiones o propuestas.
- Rediseñar todo `/admin`; el foco es la nueva ruta de detalle y los accesos a ella.

## Decisions

### 1) Ruta dedicada en vez de modal o drawer
- **Decision:** la revisión detallada vivirá en una ruta dedicada tipo `/admin/sesiones/[id]`.
- **Rationale:** la propuesta puede incluir varios bloques, balance, notas y reglas visibles. Una ruta da espacio suficiente, mejor scroll mobile y mejor auditabilidad que un modal o drawer sobre la lista.
- **Alternatives considered:**
  - Modal grande: descartado por espacio limitado y fatiga visual en propuestas largas.
  - Drawer desde la fila: descartado por ser útil para inspecciones cortas, pero pobre para decisiones administrativas con contexto.

### 2) Misma pantalla para pendiente, cerrada y archivada
- **Decision:** la ruta de detalle reutiliza la misma estructura para todos los estados, pero cambia sus acciones: las sesiones abiertas muestran CTA de aprobar/rechazar; las cerradas o archivadas pasan a modo solo lectura.
- **Rationale:** evita duplicar surfaces y mejora la trazabilidad: el admin aprende una única pantalla para revisar propuestas actuales e históricas.
- **Alternatives considered:**
  - Rutas distintas por estado: descartadas por duplicación innecesaria y peor mantenibilidad.

### 3) El balance y las dos caras del intercambio van primero
- **Decision:** la pantalla de detalle mostrará arriba el estado de la sesión, el balance global, luego `Recibe el coleccionista` y `Recibe el cambiador`, y después el detalle por bloque.
- **Rationale:** el admin necesita entender rápido si el intercambio hace sentido antes de entrar al detalle fino de cada bloque.
- **Alternatives considered:**
  - Poner primero la lista de bloques: descartada porque obliga a reconstruir mentalmente el trato antes de tener una visión global.

### 4) CTAs sticky en mobile solo para sesiones abiertas
- **Decision:** en mobile, las acciones de `Aprobar propuesta` y `Rechazar` quedan en una banda sticky inferior solo cuando la sesión sigue abierta y tiene propuesta pendiente. En sesiones cerradas o archivadas, esa banda no aparece.
- **Rationale:** mantiene las acciones a mano en propuestas largas sin contaminar la experiencia de solo lectura.
- **Alternatives considered:**
  - Acciones siempre al final: descartada porque obliga a mucho scroll en mobile.
  - Acciones sticky también en cerradas/archivadas: descartada porque sugiere editabilidad donde no la hay.

### 5) Mantener acciones rápidas en `/admin`
- **Decision:** el inbox principal conserva aceptar/rechazar desde la fila y agrega `Ver detalle` como acción complementaria.
- **Rationale:** el admin puede seguir resolviendo casos obvios rápido, pero gana una vía segura para revisar propuestas complejas sin sacrificar velocidad operativa.
- **Alternatives considered:**
  - Mover aprobar/rechazar solo al detalle: descartada porque añade fricción innecesaria en los casos simples.

## Risks / Trade-offs

- **[Riesgo] Duplicar acciones rápidas en lista y detalle puede generar inconsistencia percibida** -> **Mitigacion:** usar el mismo copy y las mismas server actions en ambos puntos.
- **[Riesgo] El detalle puede sentirse demasiado denso en mobile si todos los bloques van expandidos** -> **Mitigacion:** permitir bloques colapsables en mobile cuando haya varias propuestas o bloques largos.
- **[Trade-off] Mantener aceptar/rechazar en la lista conserva el riesgo de decisión rápida sin revisar detalle** -> **Mitigacion:** agregar `Ver detalle` visible y hacer que el detalle sea claramente la opción recomendada para propuestas complejas.
- **[Riesgo] Sesiones sin propuesta persistida pueden romper la ruta de detalle** -> **Mitigacion:** diseñar empty/error states explícitos en la ruta y no asumir que toda sesión tiene `proposal`.

## Migration Plan

1. Añadir lectura de una sesión individual para la ruta de detalle.
2. Crear la ruta `/admin/sesiones/[id]` con estados para propuesta pendiente, cerrada, archivada y ausencia de propuesta.
3. Agregar `Ver detalle` a `/admin` y `/admin/archivadas`.
4. Reutilizar las acciones existentes de aceptar/rechazar dentro del detalle y sumar CTA sticky en mobile para sesiones abiertas.
5. Cubrir con tests/QA la navegación, el modo solo lectura y la consistencia entre lista y detalle.

## Open Questions

- Queda por decidir si los bloques deben aparecer todos expandidos en desktop y colapsables en mobile, o si se usa el mismo patrón colapsable en ambas superficies.
- Puede explorarse más adelante si la vista de detalle necesita historial de decisiones o solo el estado actual de la sesión.
