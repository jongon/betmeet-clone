# admin-sesiones-archivadas Specification

## Purpose
Definir la pantalla separada para consultar el historial de sesiones de cambio archivadas desde el panel admin.

## Requirements
### Requirement: Ruta dedicada para sesiones archivadas
El sistema SHALL exponer una ruta protegida del admin dedicada a consultar sesiones de cambio archivadas. La ruta SHALL listar únicamente sesiones con `archivedAt` no nulo y SHALL mantener visible el contexto de que se trata de historial archivado, no de trabajo pendiente.

#### Scenario: Admin entra al historial archivado
- **WHEN** el admin autenticado navega a la ruta de sesiones archivadas y existen sesiones con `archivedAt` no nulo
- **THEN** la página muestra solo esas sesiones archivadas y no mezcla sesiones abiertas ni cerradas no archivadas

### Requirement: Filtros y empty state del historial archivado
La pantalla de sesiones archivadas SHALL ofrecer al menos filtro por nombre del cambiador y empty states diferenciados para `sin archivadas` y `sin resultados`, reutilizando el patrón de filtrado client-side del admin cuando sea posible.

#### Scenario: No hay sesiones archivadas
- **WHEN** el admin abre la ruta de archivadas y el repositorio no contiene sesiones con `archivedAt` no nulo
- **THEN** la página muestra un empty state específico de historial archivado y no renderiza la lista

#### Scenario: Filtro sin coincidencias en archivadas
- **WHEN** el admin aplica un filtro por nombre que no coincide con ninguna sesión archivada
- **THEN** la página muestra el estado `sin resultados` sin salir de la pantalla de archivadas

### Requirement: Navegación entre inbox y archivadas
El sistema SHALL ofrecer una navegación explícita desde `/admin` hacia la pantalla de archivadas y desde la pantalla de archivadas de vuelta al inbox principal de sesiones.

#### Scenario: Admin cambia del inbox al historial archivado
- **WHEN** el admin pulsa la navegación hacia archivadas desde `/admin`
- **THEN** el sistema lo lleva a la pantalla dedicada de archivadas

#### Scenario: Admin vuelve al inbox principal
- **WHEN** el admin pulsa la navegación de regreso desde la pantalla de archivadas
- **THEN** el sistema lo lleva a `/admin`
