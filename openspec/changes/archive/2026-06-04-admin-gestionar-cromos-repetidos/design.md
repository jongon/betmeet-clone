## Context

El producto ya cuenta con autenticación admin, generación de QR y listado de sesiones, pero no existe el módulo del álbum del coleccionista. El input funcional exige un catálogo fijo del Mundial 2026 (48 selecciones + 20 FWC) y una UI para gestionar repetidos en `/admin/cromos`.

El cambio debe respetar las convenciones actuales: App Router, Tailwind v4 CSS-first con tokens semánticos, shadcn/ui, y repositorios JSON swappables (como `sessions-store.ts` y `qr-store.ts`). Se mantiene el total oficial del álbum en 980 cromos y no se incluyen nombres reales en esta primera versión.

## Goals / Non-Goals

**Goals:**
- Entregar `/admin/cromos` protegido por el middleware existente.
- Catálogo canónico del álbum 2026 derivado desde un seed pequeño de selecciones.
- Gestión de repetidos por selección o FWC con cantidades no negativas.
- Guardado por equipo completo en una única acción.
- Vista desktop (grid) y mobile (cromo a cromo) sin perder estado local.
- Persistencia JSON por admin con auto-seed y validación Zod.

**Non-Goals:**
- Cromos faltantes.
- Editor de reglas de intercambio o overrides por cromo.
- Dataset con nombres reales de jugadores/equipo.
- Migración a Prisma/DB en este change.
- Swipe avanzado en mobile (flechas son suficientes).

## Decisions

### 1. Catálogo derivado de un seed de selecciones
- **Choice**: Seed con 48 selecciones (`albumCode`, `displayName`, `isoCode`, `confederation`) y derivación programática de los 20 cromos por equipo + 20 FWC.
- **Why**: evita mantener 980 filas manuales y preserva la regla oficial del álbum.
- **Alternatives**:
  - JSON con 980 cromos: más difícil de mantener, propenso a errores.

### 2. Nombres reales fuera de alcance
- **Choice**: Labels derivados por tipo y posición (e.g., "Jugador 7", "Foto de equipo").
- **Why**: desbloquea repetidos sin dataset editorial.
- **Alternatives**:
  - Dataset completo de nombres: incrementa tamaño y riesgo del change.

### 3. Inventario de repetidos como record sparse por usuario
- **Choice**: Persistir sólo códigos con cantidad > 0. Códigos sin entrada se interpretan como 0.
- **Why**: JSON pequeño y estable; edición más rápida.
- **Alternatives**:
  - Persistir 980 entradas: payload grande y poco legible.

### 4. Guardado por equipo completo
- **Choice**: Una acción `saveGroupRepeateds(ownerEmail, groupCode, quantities)` que reescribe los 20 cromos del grupo.
- **Why**: reduce writes y coincide con el requerimiento del usuario.
- **Alternatives**:
  - Guardado por input: más complejo y más writes.

### 5. UI responsive con dos layouts
- **Choice**: Desktop grid de 20 cards; Mobile vista por cromo con navegación por flechas y progreso.
- **Why**: mantiene densidad manejable en mobile sin añadir librerías.
- **Alternatives**:
  - Un solo layout responsive: demasiado denso en móvil.

### 6. Banderas con `react-world-flags`
- **Choice**: usar `react-world-flags` con mapping especial `ENG -> GB-ENG`, `SCO -> GB-SCO`. `FWC` sin bandera.
- **Why**: mejora escaneabilidad y evita assets locales.
- **Alternatives**:
  - Assets propios: más mantenimiento.

### 7. Persistencia JSON swappable
- **Choice**: `repeateds-store.ts` con auto-seed `data/repeateds.seed.json` y runtime `data/repeateds.json` gitignored.
- **Why**: coherencia con el resto del proyecto y migración futura sencilla a Prisma.

## Risks / Trade-offs

- **[Sin nombres reales]** → UI menos rica. **Mitigación**: labels derivados claros y plan de change posterior.
- **[JSON no concurrente]** → riesgo multi-admin. **Mitigación**: alcance demo, migración futura a Prisma.
- **[Guardado manual]** → riesgo de perder cambios si se navega sin guardar. **Mitigación**: indicador de estado sucio y confirmación visual.
- **[Selector largo]** → 49 opciones (48 + FWC). **Mitigación**: búsqueda simple en el selector.
