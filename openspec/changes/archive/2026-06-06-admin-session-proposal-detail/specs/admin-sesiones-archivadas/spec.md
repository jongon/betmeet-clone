## MODIFIED Requirements

### Requirement: Ruta dedicada para sesiones archivadas
El sistema SHALL exponer una ruta protegida del admin dedicada a consultar sesiones de cambio archivadas. La ruta SHALL listar únicamente sesiones con `archivedAt` no nulo y SHALL mantener visible el contexto de que se trata de historial archivado, no de trabajo pendiente. Cada fila SHALL ofrecer además una acción `Ver detalle` para abrir la misma ruta `/admin/sesiones/[id]` en modo solo lectura.

#### Scenario: Admin entra al historial archivado
- **WHEN** el admin autenticado navega a la ruta de sesiones archivadas y existen sesiones con `archivedAt` no nulo
- **THEN** la página muestra solo esas sesiones archivadas y no mezcla sesiones abiertas ni cerradas no archivadas

#### Scenario: Ver detalle desde archivadas
- **WHEN** el admin revisa una fila del historial archivado
- **THEN** puede abrir `/admin/sesiones/[id]` para consultar la propuesta en modo solo lectura
