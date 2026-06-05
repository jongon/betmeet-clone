## Why

El flujo publico del cambiador ya usa el catalogo del album para mostrar faltantes y repetidos, pero parte de esas listas seguia ordenandose por codigo alfabetico. Eso rompe la continuidad visual con el album fisico y hace mas dificil ubicar cromos rapidamente durante un intercambio presencial.

## What Changes

- Documentar que el flujo publico de propuesta debe seguir el orden oficial del album 2026.
- Exigir que los faltantes visibles, los repetidos disponibles y las selecciones guardadas preserven el orden canonico del album.
- Dejar una spec principal minima para `cambiador-propuesta-cambio` enfocada en el orden del album, separada del change mas grande del wizard que sigue activo.

## Capabilities

### New Capabilities
- `cambiador-propuesta-cambio`: orden oficial del album en las listas publicas del wizard del cambiador.

## Impact

- El flujo de `/cambio/[token]` debe presentar los cromos solicitados y disponibles con la misma secuencia que el album fisico.
- La persistencia de seleccion no cambia, pero al rehidratarse debe mostrarse en orden canonico y no por `localeCompare`.
