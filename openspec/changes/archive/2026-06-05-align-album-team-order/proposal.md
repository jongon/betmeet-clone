## Why

El catálogo del álbum ya existía en la app, pero el orden usado en las pantallas no seguía el orden oficial de aparición del álbum Panini 2026. Eso hace que el admin vea selecciones en un orden distinto al impreso y que el flujo público mezcle cromos por orden alfabético en lugar de respetar el recorrido real del álbum.

## What Changes

- Reordenar el catálogo canónico para que `FWC` aparezca primero y las 48 selecciones sigan el orden oficial del álbum.
- Hacer que los selectores y vistas que dependen de `getAlbumGroups()` hereden ese orden sin reordenamientos locales.
- Introducir un comparador canónico de códigos de cromo para que las listas públicas derivadas del inventario mantengan el orden del álbum en lugar del orden lexicográfico.

## Capabilities

### Modified Capabilities
- `admin-cromos-repetidos`: el selector y el grupo inicial deben seguir el orden oficial del álbum, comenzando por `FWC`.
- `admin-cromos-faltantes`: la vista completa del álbum debe renderizar grupos en el orden oficial del álbum, comenzando por `FWC`.

## Impact

- `src/lib/album-catalog.ts` pasa a ser la fuente de verdad del orden oficial del álbum.
- Los paneles `/admin/cromos` y `/admin/cromos/faltantes` cambian el orden visible de grupos sin cambiar el modelo de persistencia.
- El flujo público reutiliza el mismo orden al listar cromos derivados del inventario.
