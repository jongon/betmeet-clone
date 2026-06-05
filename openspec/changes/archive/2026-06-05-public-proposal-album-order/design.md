## Context

La implementacion del wizard publico ya construye listas desde inventarios sparse del admin. Ese origen hace facil caer en ordenamientos lexicograficos por codigo, aunque el usuario espera recorrer el album en su orden real. En contexto presencial, ese detalle afecta velocidad de escaneo y reduce confianza porque la app no coincide con el album impreso.

## Goals / Non-Goals

**Goals:**
- Hacer explicito en OpenSpec que el wizard publico sigue el orden oficial del album.
- Cubrir tanto la lista de faltantes como la de repetidos disponibles y las selecciones rehidratadas.
- Mantener el cambio solo documental respecto al flujo publico.

**Non-Goals:**
- Redefinir el wizard completo del cambiador.
- Cambiar reglas de intercambio, copy o pasos del flujo.
- Reemplazar el change activo `mobile-exchange-proposal-flow`.

## Decisions

### 1. Spec pública mínima y enfocada
- **Choice**: crear una spec principal pequeña para `cambiador-propuesta-cambio` limitada al orden del album.
- **Why**: permite documentar el comportamiento ya implementado sin bloquearse por la falta de sincronizacion del change mas grande del wizard.

### 2. El orden aplica a listas derivadas y a rehidratacion
- **Choice**: exigir el orden canonico tanto al listar faltantes y repetidos como al reconstruir selecciones guardadas.
- **Why**: si solo se ordena la vista inicial, el flujo puede volver a desalinearse al recargar una sesion.

## Risks / Trade-offs

- La capability publica quedara documentada de forma parcial hasta que el change grande del wizard se sincronice tambien.
- Aun asi, el aspecto que motivó este ajuste queda trazable y archivado por separado.
