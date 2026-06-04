## Purpose

Gestión del inventario de cromos repetidos del admin en `/admin/cromos`, incluyendo catálogo canónico del álbum 2026, UX de edición desktop/mobile y persistencia por propietario en repositorio JSON swappable.

## Requirements

### Requirement: Ruta /admin/cromos para gestionar repetidos
El sistema SHALL renderizar la ruta protegida `/admin/cromos` como panel de gestión de cromos repetidos del admin autenticado. La vista SHALL mostrar un selector de equipo/categoría y la edición de cantidades de repetidos para el grupo seleccionado.

#### Scenario: Admin autenticado accede a /admin/cromos
- **WHEN** el admin autenticado navega a `/admin/cromos`
- **THEN** la página renderiza el selector de equipos y la UI de edición de repetidos

### Requirement: Catálogo oficial del álbum 2026
El sistema SHALL construir un catálogo canónico del álbum 2026 con 48 selecciones y la categoría especial `FWC`, totalizando 980 cromos: 20 por selección y 20 `FWC`. Cada selección SHALL generar códigos `[PAIS]-1` a `[PAIS]-20`, y `FWC-0` a `FWC-19` para los especiales.

#### Scenario: Total del álbum
- **WHEN** el catálogo se deriva a partir del seed de selecciones
- **THEN** el total de cromos es 980 y cada selección tiene exactamente 20 códigos

### Requirement: Tipos de cromo derivados por posición
El sistema SHALL derivar el tipo de cromo automáticamente a partir del código: posición 1 => `BADGE`, posición 13 => `TEAM_PHOTO`, posiciones restantes => `PLAYER`, prefijo `FWC` => `SPECIAL`.

#### Scenario: Derivación correcta del tipo
- **WHEN** se consulta el tipo de `MEX-1`, `MEX-13`, `MEX-7` y `FWC-10`
- **THEN** los tipos resultan `BADGE`, `TEAM_PHOTO`, `PLAYER` y `SPECIAL` respectivamente

### Requirement: Selector de equipo con banderas y búsqueda
El sistema SHALL proveer un selector de equipo/categoría que muestre nombre y bandera usando `isoCode`. El mapping especial MUST aplicar `ENG -> GB-ENG` y `SCO -> GB-SCO`. La opción `FWC` SHALL mostrarse sin bandera. El selector SHALL incluir búsqueda simple por nombre o código.

#### Scenario: Selector con banderas
- **WHEN** el admin abre el selector de equipos
- **THEN** cada selección muestra su bandera y nombre, y `FWC` aparece sin bandera

### Requirement: Edición de repetidos en desktop
En viewport `>= 768px`, el sistema SHALL mostrar una grilla de 20 cards para el grupo seleccionado. Cada card SHALL mostrar el código, un badge de tipo, un label derivado y un input numérico de cantidad. Las cards con cantidad > 0 SHALL destacarse visualmente usando tokens semánticos.

#### Scenario: Desktop muestra grid con resaltado
- **WHEN** el admin selecciona un equipo en desktop
- **THEN** se renderizan 20 cards con inputs y las cantidades > 0 se resaltan

### Requirement: Búsqueda global de selecciones y cromos
El sistema SHALL ofrecer una búsqueda global dentro de `/admin/cromos` que permita encontrar selecciones por nombre o código, y también cromos por su código específico. La búsqueda de cromos MUST limitarse al código del equipo y la numeración del cromo, aceptando variantes flexibles como espacios o guiones. Si la búsqueda coincide con cromos de otro grupo, la vista SHALL cambiar automáticamente al primer grupo coincidente sin perder la capacidad de guardar por equipo. Si no hay coincidencias visibles, SHALL mostrar un estado vacío que preserve el contexto.

#### Scenario: Admin busca un cromo específico en todo el álbum
- **WHEN** el admin escribe un código como `ARG-7` o `ARG 7` en la búsqueda de repetidos
- **THEN** la vista cambia al grupo coincidente y la lista visible se filtra a los cromos coincidentes de ese grupo

#### Scenario: Admin busca una selección
- **WHEN** el admin escribe un nombre o código de selección como `Argentina` o `ARG`
- **THEN** el selector muestra esa selección y el panel mantiene ese grupo como contexto activo

#### Scenario: Búsqueda sin resultados
- **WHEN** el admin busca un término que no existe en el álbum o no deja resultados visibles en el grupo activo
- **THEN** la vista muestra un estado vacío con mensaje para ajustar la búsqueda sin perder el contexto actual

### Requirement: Edición de repetidos en mobile
En viewport `< 768px`, el sistema SHALL mostrar un único cromo a la vez con controles de navegación por flechas y un indicador de progreso con formato `Cromo X de 20`.

#### Scenario: Mobile navega cromo a cromo
- **WHEN** el admin navega en mobile con las flechas
- **THEN** el cromo visible cambia y el indicador refleja la posición actual

### Requirement: Persistencia de inventario por admin
El sistema SHALL persistir los repetidos en un repositorio JSON swappable por `ownerEmail`, con auto-seed desde `data/repeateds.seed.json`. El inventario SHALL almacenarse como record sparse de `stickerCode -> cantidad` y las cantidades 0 SHALL eliminarse del record antes de persistir. La lectura SHALL validarse con Zod.

#### Scenario: Persistencia sparse
- **WHEN** el admin guarda un grupo con varias cantidades en 0
- **THEN** el repositorio persiste solo las cantidades positivas

### Requirement: Guardado por equipo completo
El sistema SHALL guardar los cambios del grupo seleccionado en una única acción, validando que las cantidades sean enteros no negativos y que los códigos pertenezcan al grupo. Al finalizar, SHALL revalidar `/admin/cromos`.

#### Scenario: Guardado válido
- **WHEN** el admin guarda un equipo con cantidades válidas
- **THEN** el repositorio se actualiza y la página se revalida sin error

### Requirement: Entradas no negativas
El sistema SHALL impedir cantidades negativas en la UI y en el servidor. Inputs vacíos SHALL normalizarse a 0.

#### Scenario: Cantidad negativa
- **WHEN** el admin intenta guardar una cantidad negativa
- **THEN** la validación falla y no se persisten cambios
