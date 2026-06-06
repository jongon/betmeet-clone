## 1. Datos y navegación

- [x] 1.1 Exponer lectura de una sesión individual para la nueva ruta de detalle admin
- [x] 1.2 Crear la ruta protegida `/admin/sesiones/[id]` con manejo de sesión inexistente o sin propuesta
- [x] 1.3 Agregar la acción `Ver detalle` en las filas de `/admin` y `/admin/archivadas`

## 2. Surface de detalle de propuesta

- [x] 2.1 Construir el header del detalle con nombre del cambiador, estado, fecha y navegación de regreso
- [x] 2.2 Mostrar balance, lo que recibe el coleccionista, lo que recibe el cambiador y el detalle por bloque de la propuesta
- [x] 2.3 Reutilizar la misma surface en modo solo lectura para sesiones cerradas o archivadas
- [x] 2.4 Implementar CTA sticky en mobile para aprobar y rechazar cuando la sesión siga abierta y tenga propuesta pendiente

## 3. Acciones y consistencia

- [x] 3.1 Reutilizar las acciones existentes de aceptar y rechazar dentro del detalle de la sesión abierta
- [x] 3.2 Mantener las acciones rápidas de aceptar y rechazar en la lista principal sin romper la nueva navegación a detalle
- [x] 3.3 Asegurar que las sesiones cerradas o archivadas no expongan acciones de decisión en el detalle

## 4. Verificación

- [x] 4.1 Cubrir con tests o QA verificable la navegación a detalle desde inbox y archivadas
- [x] 4.2 Cubrir con tests o QA verificable el modo solo lectura para cerradas/archivadas y el sticky CTA para pendientes
- [x] 4.3 Correr `pnpm lint`
- [x] 4.4 Correr `pnpm build`
