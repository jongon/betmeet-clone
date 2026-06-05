## Context

La app ya usa un catálogo derivado del álbum 2026 para repetidos, faltantes y el flujo público de intercambio. El problema no está en la estructura del catálogo sino en el orden: el seed estaba organizado por confederación o carga histórica, mientras algunas listas derivadas además se ordenaban por `localeCompare` del código.

## Goals / Non-Goals

**Goals:**
- Centralizar el orden oficial del álbum en un único lugar.
- Asegurar que `FWC` aparezca primero en los selectores y como grupo inicial.
- Reutilizar el mismo orden al ordenar códigos de cromo en vistas derivadas del inventario.

**Non-Goals:**
- Cambiar códigos persistidos o migrar inventarios existentes.
- Rediseñar pantallas o cambiar copy fuera del orden.
- Completar o sincronizar la spec futura del wizard público.

## Decisions

### 1. El orden oficial vive en `TEAM_SEED`
- **Choice**: reordenar `TEAM_SEED` según la secuencia oficial del álbum y devolver `FWC` antes del resto en `getAlbumGroups()`.
- **Why**: minimiza cambios porque casi todas las pantallas ya dependen de esa fuente.

### 2. Comparador canónico para códigos de cromo
- **Choice**: agregar comparadores por grupo y por código de cromo basados en el orden del catálogo.
- **Why**: evita que listas construidas desde inventarios u otras colecciones vuelvan a ordenarse alfabéticamente.

### 3. Sin cambios de compatibilidad en persistencia
- **Choice**: mantener los mismos `albumCode` ya usados por el sistema, aunque el orden cambie.
- **Why**: el pedido es de orden visual y no requiere migraciones de datos.

## Risks / Trade-offs

- Si alguna pantalla asumía que `groups[0]` era una selección y no `FWC`, cambiará su estado inicial. En este caso es deseado porque el álbum inicia con `FWC`.
- El flujo público sigue teniendo spec principal incompleta en OpenSpec, así que este change documenta el ajuste desde las capabilities admin afectadas y el impacto transversal.
