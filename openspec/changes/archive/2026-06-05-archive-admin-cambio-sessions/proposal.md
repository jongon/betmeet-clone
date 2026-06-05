## Why

Cuando el coleccionista acumula muchas sesiones cerradas, la pantalla `/admin` pierde foco y deja de priorizar las sesiones activas que requieren decisión. Hace falta separar el trabajo diario de las sesiones archivadas para mantener el panel escaneable.

## What Changes

- Añadir una acción para archivar sesiones de cambio cerradas desde el panel admin.
- Sacar las sesiones archivadas del listado principal de `/admin` para que esa pantalla priorice sesiones abiertas y cerradas no archivadas.
- Añadir una pantalla separada para consultar sesiones archivadas con sus filtros y estado vacío propio.
- Mantener la persistencia de archivado en el repositorio de sesiones sin perder compatibilidad con datos existentes.

## Capabilities

### New Capabilities
- `admin-sesiones-archivadas`: navegación y visualización dedicada de sesiones archivadas desde una pantalla separada.

### Modified Capabilities
- `admin-sesiones`: el listado principal y las acciones de sesión cambian para soportar archivado y para excluir archivadas de `/admin`.

## Impact

- Afecta `src/app/admin/page.tsx` y añadirá una nueva ruta admin para archivados.
- Afecta componentes de lista de sesiones y sus server actions.
- Afecta `src/lib/sessions.ts` y `src/lib/sessions-store.ts` para persistir el estado de archivado.
- Requiere nuevas specs OpenSpec para el comportamiento de archivado y un delta sobre `admin-sesiones`.
