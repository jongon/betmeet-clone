## MODIFIED Requirements

### Requirement: Catálogo oficial del álbum 2026
El sistema SHALL construir un catálogo canónico del álbum 2026 con 48 selecciones y la categoría especial `FWC`, totalizando 980 cromos: 20 por selección y 20 `FWC`. Cada selección SHALL generar códigos `[PAIS]-1` a `[PAIS]-20`, y `FWC-0` a `FWC-19` para los especiales. El catálogo SHALL exponer `FWC` primero y luego las selecciones en el orden oficial de aparición del álbum Panini 2026.

#### Scenario: Orden oficial del catálogo
- **WHEN** la UI obtiene los grupos del catálogo para `/admin/cromos`
- **THEN** `FWC` aparece primero y el resto de selecciones sigue el orden oficial del álbum

### Requirement: Selector de equipo con banderas y búsqueda
El sistema SHALL proveer un selector de equipo/categoría que muestre nombre y bandera usando `isoCode`. El mapping especial MUST aplicar `ENG -> GB-ENG` y `SCO -> GB-SCO`. La opción `FWC` SHALL mostrarse sin bandera. El selector SHALL incluir búsqueda simple por nombre o código y SHALL preservar el orden oficial del catálogo en sus resultados base.

#### Scenario: Grupo inicial del panel
- **WHEN** el admin abre `/admin/cromos` sin búsqueda activa
- **THEN** el grupo inicial visible es `FWC`
