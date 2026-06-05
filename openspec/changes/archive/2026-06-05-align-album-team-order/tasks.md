## 1. Catálogo oficial

- [x] 1.1 Reordenar el seed del catálogo según el orden oficial del álbum 2026
- [x] 1.2 Hacer que `FWC` aparezca antes del resto de grupos en `getAlbumGroups()`
- [x] 1.3 Agregar comparadores reutilizables para grupos y códigos de cromo en orden de álbum

## 2. Pantallas y flujos dependientes

- [x] 2.1 Aplicar el orden del catálogo en `/admin/cromos`
- [x] 2.2 Mantener la vista `/admin/cromos/faltantes` alineada con el orden oficial del catálogo
- [x] 2.3 Ordenar los cromos del flujo público derivados del inventario con el comparador canónico

## 3. Verificación

- [x] 3.1 Actualizar o ampliar tests del orden derivado de códigos
- [x] 3.2 Correr `pnpm lint`
- [x] 3.3 Correr `pnpm test src/lib/cambio-proposal.test.ts`
