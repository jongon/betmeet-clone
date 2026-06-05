## MODIFIED Requirements

### Requirement: Ruta /admin/cromos/faltantes con vista de album completo
El sistema SHALL exponer la ruta protegida `/admin/cromos/faltantes` como panel de gestion de cromos faltantes del admin autenticado. La vista SHALL mostrar los 980 cromos del album 2026 agrupados por seleccion y numeracion. Los grupos SHALL renderizarse con `FWC` primero y luego con las selecciones en el orden oficial del album 2026. Dentro de cada grupo, los cromos faltantes SHALL aparecer primero y los no faltantes despues.

#### Scenario: Orden oficial de grupos
- **WHEN** el admin abre la vista completa de faltantes
- **THEN** la pantalla muestra `FWC` primero y luego las selecciones segun el orden oficial del álbum
