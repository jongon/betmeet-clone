## 1. Modelo y repositorio

- [x] 1.1 Añadir `archivedAt` al schema de `Session` y normalizar sesiones legacy sin ese campo
- [x] 1.2 Implementar en `sessions-store` la operación para archivar sesiones cerradas y proteger sesiones abiertas contra archivado

## 2. Inbox principal de /admin

- [x] 2.1 Excluir sesiones archivadas del listado principal y mantener métricas/navegación coherentes
- [x] 2.2 Añadir la acción de archivar en filas cerradas no archivadas con refresh sin recarga completa

## 3. Pantalla de archivadas

- [x] 3.1 Crear la nueva ruta protegida de archivadas con header y navegación de vuelta al inbox
- [x] 3.2 Reutilizar la lista de sesiones con filtros y empty states adaptados al historial archivado

## 4. Validación

- [x] 4.1 Añadir o ajustar tests del store para archivado y compatibilidad legacy
- [x] 4.2 Ejecutar las verificaciones relevantes (`pnpm build`, tests afectados) y corregir fallos
