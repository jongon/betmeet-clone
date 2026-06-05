## ADDED Requirements

### Requirement: Orden oficial del album en el wizard publico
El sistema SHALL mostrar los cromos del flujo publico de propuesta en `/cambio/[token]` siguiendo el orden oficial del album 2026. La lista de cromos faltantes del coleccionista SHALL mostrar `FWC` primero y luego las selecciones segun el orden canonico del catalogo. La lista de repetidos disponibles del coleccionista SHALL seguir ese mismo orden.

#### Scenario: Faltantes en orden de album
- **WHEN** el cambiador entra a una sesion y ve los cromos que el coleccionista necesita
- **THEN** la lista visible respeta el orden oficial del album y no un orden alfabetico por codigo

#### Scenario: Repetidos disponibles en orden de album
- **WHEN** el cambiador revisa los repetidos que puede pedir al coleccionista
- **THEN** la lista visible respeta el mismo orden oficial del album

### Requirement: Rehidratacion de seleccion preservando el orden canonico
Cuando el sistema reanuda una sesion publica con seleccion previa de cromos, SHALL reconstruir la propuesta preservando el orden canonico del album para los codigos seleccionados y para los repetidos solicitados.

#### Scenario: Sesion reanudada con codigos seleccionados
- **WHEN** el cambiador reabre una sesion que ya tenia cromos seleccionados
- **THEN** el sistema muestra esos codigos en el orden oficial del album y no por `localeCompare`
