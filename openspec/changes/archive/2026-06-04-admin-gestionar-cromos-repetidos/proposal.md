## Why

El flujo del producto depende de que el admin tenga un inventario real de cromos para poder intercambiar, pero hoy el panel solo cubre QR y sesiones. Sin un módulo de repetidos, el cambio queda incompleto y la futura vista pública `/cambio/[token]` no puede ofrecer información útil.

Este change introduce la primera parte del álbum del coleccionista (repetidos) con un catálogo canónico del Mundial 2026 y una UI dedicada en `/admin/cromos`, para que el admin pueda gestionar cantidades por equipo con persistencia propia.

## What Changes

- Nueva ruta protegida `/admin/cromos` para gestionar cromos repetidos por selección o por la categoría especial `FWC`.
- Catálogo canónico del álbum 2026 derivado de 48 selecciones y reglas fijas de 20 cromos por equipo + 20 especiales FWC (total 980).
- Persistencia de repetidos por admin en un repositorio JSON swappable (mismo patrón que `sessions-store.ts` / `qr-store.ts`).
- UI desktop con grid de 20 cards por equipo y UI mobile con navegación cromo a cromo e indicador de progreso.
- Botón de guardado por equipo completo (no guarda por cada input individual).
- Banderas de equipos vía `react-world-flags` con mapeo especial `ENG -> GB-ENG` y `SCO -> GB-SCO`.

## Capabilities

### New Capabilities
- `admin-cromos-repetidos`: Gestión del inventario de cromos repetidos del admin en `/admin/cromos`, basado en catálogo oficial del álbum 2026 y persistencia por usuario.

### Modified Capabilities
- `admin-auth`: `/admin/cromos` queda protegido por el middleware existente de `/admin/*` (sin lógica adicional).

## Impact

- **UI**: nueva pantalla `/admin/cromos` y CTA desde `/admin`.
- **Datos**: nuevo catálogo estático del álbum, nuevo repositorio JSON para repetidos, nuevo seed vacío.
- **Dependencias**: añade `react-world-flags`.
- **Specs**: agrega spec de `admin-cromos-repetidos`; ajuste menor de alcance en `admin-auth` para reflejar la ruta.
