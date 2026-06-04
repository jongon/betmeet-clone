# PROJECT.md

## Qué es

Plataforma web para gestionar e intercambiar cromos del Mundial 2026. Permite al coleccionista registrar sus cromos repetidos y faltantes, generar un QR personalizado, y que otra persona pueda ver qué cromos le faltan y ofrecer un cambio.

## Por qué

Los intercambios de cromos se coordinan hoy de forma manual: por mensaje, de memoria, o con listas en papel. Esta app elimina esa fricción — cada coleccionista tiene un link/QR que muestra exactamente qué necesita, en tiempo real.

## Usuarios

- **Coleccionista**: administra su álbum, marca repetidos y faltantes, genera QR
- **Cambiador**: escanea el QR, ve qué le falta al coleccionista, ofrece sus cromos

## Flujo principal (visión)

1. Coleccionista marca sus repetidos y faltantes en `/admin`
2. Genera un QR con token único
3. Cambiador escanea el QR
4. Cambiador ve los cromos que le faltan al coleccionista
5. Cambiador ofrece sus cromos para el cambio
6. Coleccionista recibe la oferta y coordina el intercambio

## Estado actual

- Admin autenticado con generación de QR y listado de sesiones
- Botón "Generar QR" en `/admin` crea un token único y muestra el código en un dialog
- Sesiones abiertas muestran botón "Ver QR" para reabrir el código original
- `/admin/cromos` permite gestionar repetidos por selección o FWC
- Persistencia temporal en JSON (runtime) con seeds vacíos
- Vista pública `/cambio/[token]` aún pendiente

## Rutas actuales

| Ruta | Descripción |
|------|-------------|
| `/` | Página raíz |
| `/admin` | Panel del admin con sesiones y QR |
| `/admin/cromos` | Gestión de cromos repetidos |
| `/admin/login` | Acceso admin |
| `/design-system` | Galería de componentes |

## Rutas planeadas

| Ruta | Descripción |
|------|-------------|
| `/(colección)` | Panel principal del coleccionista — gestión del álbum |
| `/admin` | Configuración, generación de QR, gestión de cuenta |
| `/cambio/[token]` | Vista pública para el cambiador (sin auth) |
