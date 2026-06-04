## 1. Dependencias y configuración

- [x] 1.1 Instalar `react-world-flags`
- [x] 1.2 Añadir `data/repeateds.json` a `.gitignore`

## 2. Catálogo del álbum 2026

- [x] 2.1 Crear seed de selecciones (48 equipos) con `albumCode`, `displayName`, `isoCode`, `confederation`
- [x] 2.2 Implementar mapping ISO especial `ENG -> GB-ENG` y `SCO -> GB-SCO`
- [x] 2.3 Derivar los 20 cromos por selección y los 20 especiales `FWC`
- [x] 2.4 Derivar el tipo por código (BADGE, PLAYER, TEAM_PHOTO, SPECIAL)
- [x] 2.5 Verificar que el catálogo totaliza 980 cromos

## 3. Schemas y repositorio de repetidos

- [x] 3.1 Crear `src/lib/repeateds.ts` con tipos y schemas Zod del inventario
- [x] 3.2 Crear `data/repeateds.seed.json` con `[]`
- [x] 3.3 Crear `src/lib/repeateds-store.ts` con auto-seed en primer acceso
- [x] 3.4 Persistir inventario por `ownerEmail`
- [x] 3.5 Persistir solo cantidades > 0 y eliminar entradas con 0
- [x] 3.6 Validar JSON con Zod y fallar explícitamente si está corrupto

## 4. Server Actions

- [x] 4.1 Crear `src/app/admin/cromos/actions.ts` con `'use server'`
- [x] 4.2 Implementar `saveGroupRepeateds` con validación de enteros no negativos
- [x] 4.3 Validar que los códigos pertenecen al grupo seleccionado
- [x] 4.4 Revalidar `/admin/cromos` tras guardar

## 5. Ruta y navegación

- [x] 5.1 Crear `src/app/admin/cromos/page.tsx`
- [x] 5.2 Leer usuario autenticado desde Supabase SSR
- [x] 5.3 Cargar catálogo + inventario del usuario autenticado
- [x] 5.4 Añadir CTA/link visible desde `/admin` hacia `/admin/cromos`

## 6. UI de selección y edición

- [x] 6.1 Crear selector de equipo/categoría con bandera y búsqueda simple
- [x] 6.2 Implementar vista desktop con grid de 20 cards
- [x] 6.3 Cada card muestra código, badge de tipo, label derivado e input numérico
- [x] 6.4 Resaltar cards con cantidad > 0 usando tokens semánticos
- [x] 6.5 Implementar vista mobile con navegación por flechas
- [x] 6.6 Mostrar indicador de progreso `Cromo X de 20`
- [x] 6.7 Mostrar estado sucio y botón Guardar por grupo
- [x] 6.8 Deshabilitar guardado mientras la mutación está en curso
- [x] 6.9 Mostrar feedback de éxito/error tras guardar

## 7. Documentación y verificación automática

- [x] 7.1 Actualizar `docs/PROJECT.md` con `/admin/cromos`
- [x] 7.2 Actualizar `docs/STACK.md` con `react-world-flags`
- [x] 7.3 Correr `pnpm lint`
- [x] 7.4 Correr `pnpm build`
- [x] 7.5 Correr `pnpm biome check src/ data/`
