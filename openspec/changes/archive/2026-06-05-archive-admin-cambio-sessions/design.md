## Context

Hoy `/admin` mezcla sesiones abiertas con cerradas en una sola lista. Cuando el historial crece, las sesiones activas pierden visibilidad y el panel deja de servir como inbox operativo. La app ya tiene un repositorio JSON de sesiones, una ruta protegida `/admin` y componentes cliente para filtrar y accionar cada fila, así que el cambio toca modelo, store, server actions, navegación y presentación.

## Goals / Non-Goals

**Goals:**
- Separar las sesiones archivadas del listado principal de `/admin`.
- Permitir archivar solo sesiones cerradas desde el admin.
- Añadir una ruta dedicada para consultar archivadas con filtros y estado vacío propio.
- Mantener compatibilidad con sesiones existentes sin archivado persistido.

**Non-Goals:**
- No reabrir sesiones archivadas en esta iteración.
- No introducir paginación, búsqueda server-side ni cambios de base de datos.
- No cambiar el flujo público `/cambio/[token]` ni el significado de aceptar/rechazar sesiones.

## Decisions

### 1. Persistir archivado como metadato en la sesión
- **Decision:** añadir `archivedAt: string | null` al modelo `Session`.
- **Rationale:** alcanza para distinguir archivadas activas del historial sin crear un nuevo estado que compita con `open` y `closed`.
- **Alternatives considered:**
  - Nuevo `status: archived`: descartado porque mezcla el ciclo operativo con una preocupación de organización visual.
  - Borrar sesiones archivadas del store principal: descartado porque perdería trazabilidad.

### 2. `/admin` muestra solo sesiones no archivadas
- **Decision:** la ruta principal filtrará fuera cualquier sesión con `archivedAt` no nulo y mantendrá su foco en abiertas y cerradas recientes.
- **Rationale:** resuelve el problema central de densidad sin cambiar la interacción que ya funciona para el trabajo diario.
- **Alternatives considered:**
  - Mantener archivadas en `/admin` detrás de otro tab: descartado porque sigue cargando la misma pantalla con demasiados registros.

### 3. Crear una ruta dedicada para historial archivado
- **Decision:** añadir una nueva pantalla admin para archivadas, enlazada desde `/admin`.
- **Rationale:** separa claramente el inbox operativo del historial y permite reutilizar el patrón actual de filtros.
- **Alternatives considered:**
  - Modal o drawer dentro de `/admin`: descartado porque el historial puede crecer y necesita su propio espacio.

### 4. La acción de archivar vive en filas cerradas no archivadas
- **Decision:** mostrar el CTA de archivar solo en sesiones `closed` con `archivedAt: null`.
- **Rationale:** evita archivar sesiones abiertas por error y respeta la lógica de que primero se decide, luego se ordena el historial.
- **Alternatives considered:**
  - Permitir archivar también abiertas: descartado porque escondería trabajo pendiente.

### 5. Compatibilidad hacia atrás por normalización en el store
- **Decision:** cualquier sesión legacy sin `archivedAt` se normaliza a `null` al leer.
- **Rationale:** evita migraciones manuales sobre el JSON actual y mantiene robustez ante datos viejos.

## Risks / Trade-offs

- [Sesiones cerradas desaparecen de `/admin` antes de que el usuario entienda dónde quedaron] → Añadir CTA visible hacia archivadas y feedback posterior a la acción de archivar.
- [La ruta de archivadas duplica demasiado código de la lista actual] → Reutilizar `SessionList` y `SessionRow` con variantes controladas por props.
- [Ediciones manuales del JSON sin `archivedAt`] → Normalizar en `sessions-store` antes de validar con Zod.
