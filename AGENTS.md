# AGENTS.md

Plataforma web para intercambio de cromos del Mundial 2026. Coleccionistas gestionan su álbum y generan un QR; los cambiadores escanean el QR y ofrecen sus cromos.

## Setup

`.agent/` es la **fuente de verdad** para configuración MCP de herramientas AI. `scripts/setup-agent.sh` genera los archivos de configuración MCP para cada herramienta:

- `.claude/settings.json` — MCP config para Claude Code
- `.opencode/opencode.json` — MCP config para opencode

Cada herramienta AI (Claude, opencode, Cursor, Kiro) genera sus propios directorios `commands/` y `skills/` automáticamente.

**Ejecutar tras clonar** para generar la configuración MCP:

```bash
bash scripts/setup-agent.sh
```

### Configuración de opencode

opencode busca su configuración en `opencode.json` en la raíz del proyecto. Para usar `.opencode/opencode.json`, configura la variable de entorno:

```bash
export OPENCODE_CONFIG=/var/www/html/.opencode/opencode.json
```

El devcontainer ya tiene esta variable configurada en `remoteEnv`.

### Añadir un MCP server

1. Editar `.agent/config/mcp/source.json` (entrada nueva en `servers`)
2. Si el cliente lo necesita en formato distinto a remote, añadir un case en `to_claude_entry()` dentro del script
3. Correr `bash scripts/setup-agent.sh`

## Documentación

| Archivo | Contenido |
|---------|-----------|
| `docs/PROJECT.md` | Qué construimos, por qué, estado actual, rutas planeadas |
| `docs/STACK.md` | Stack técnico, design system, tokens, tipografía |
| `docs/ARCHITECTURE.md` | Arquitectura Docker, servicios, puertos, volúmenes, debug |
| `docs/WORKFLOWS.md` | Comandos para iniciar, detener y operar el entorno |

## Stack

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 |
| UI Components | shadcn/ui |
| Base de datos | PostgreSQL 18 + Prisma |
| Deploy | Vercel + Supabase |

## Rutas actuales

| Ruta | Descripción |
|------|-------------|
| `/` | Página raíz |
| `/design-system` | Galería de componentes y tokens (dev only) |

## Convenciones

- **App Router únicamente** — nunca Pages Router
- **Tailwind v4 CSS-first** — sin `tailwind.config.*`; tokens en `src/app/globals.css`
- **Colores semánticos** — `bg-primary`, `text-brand`, etc.; nunca valores literales en componentes
- **shadcn/ui CLI** para agregar componentes; iconos via `lucide-react`
- **Context7** — consultar siempre antes de usar cualquier librería externa
- **Server Actions** para lógica de servidor; **Prisma** para DB y migraciones
- Componentes en `src/components`; alias `@/*` apunta a `src/`

## Verificaciones automatizadas

| Script | Qué valida |
|--------|------------|
| `pnpm lint` | ESLint 9 + flat config + tipado |
| `pnpm build` | Next build (TypeScript incluido) |
| `pnpm contrast` | WCAG 2.1 AA sobre tokens light/dark (`scripts/contrast-check.mjs`) |
| `pnpm check:toggle` | SSR del toggle + tokens en CSS (`scripts/check-theme-toggle.mjs`) |
| `pnpm check:toggle:browser` | Click real con Playwright, FOUC, capturas (`scripts/check-theme-toggle-browser.mjs`) |

## UX Guardrails For New Features

Aplica solo a features nuevos. No obliga a rediseñar rutas o pantallas existentes.

### Objetivo

Evitar que una feature nueva se resuelva solo con componentes bonitos pero con una experiencia confusa. Primero se diseña el flujo y la decisión principal; después se eligen layout y componentes.

### Cuándo aplica

- Nuevas rutas
- Nuevos flujos dentro de rutas existentes
- Nuevas acciones importantes en pantallas existentes
- Nuevos estados vacíos, de error o de éxito

No aplica retroactivamente a UI ya construida salvo que la change lo pida explícitamente.

### Regla principal

Cada pantalla nueva debe dejar claro en pocos segundos:

1. Qué está pasando
2. Qué puede hacer el usuario ahora
3. Qué acción es la principal
4. Qué pasa después de esa acción

### Screen Contract

Antes de implementar una pantalla o un flujo nuevo, definir:

- Objetivo del usuario
- Contexto de llegada
- Acción principal
- Acciones secundarias
- Información mínima necesaria para decidir
- Estado vacío
- Estado loading
- Estado error
- Estado success o feedback posterior
- Consideraciones mobile

Plantilla:

```md
## Screen Contract

### Ruta o surface
- `/ruta` o componente/flujo

### Objetivo del usuario
- Qué intenta lograr sin lenguaje técnico

### Contexto de llegada
- Desde dónde llega y qué sabe ya

### Acción principal
- CTA principal y resultado esperado

### Acciones secundarias
- Acciones de soporte, no competir con la principal

### Información mínima para decidir
- Datos que deben estar visibles antes del CTA

### Estados
- Empty:
- Loading:
- Error:
- Success:

### Mobile
- Qué debe verse primero en viewport pequeño
- Qué se puede posponer detrás de interacción
```

### Reglas de UX

1. Una pantalla no debe competir con varias acciones primarias.
2. El CTA principal debe ser visible sin interpretar demasiado la UI.
3. El estado vacío debe orientar la siguiente acción, no solo decir que no hay datos.
4. Loading y error deben preservar contexto: qué intentaba hacer el usuario.
5. El copy debe explicar la consecuencia de la acción, no usar texto genérico.
6. En móvil, priorizar decisión y CTA antes que decoración o contenido secundario.
7. Formularios nuevos deben minimizar campos y agrupar decisiones relacionadas.
8. No introducir patrones visuales nuevos si el design system existente ya cubre el caso.
9. Si una pantalla depende de una lista o tabla, definir qué pasa con 0, 1 y muchos resultados.
10. Cada feature nueva debe incluir feedback posterior a acciones importantes.

### Checklist para OpenSpec

Al escribir `proposal.md`, `design.md` o `tasks.md` de una feature nueva, incluir cuando corresponda:

- Journey principal afectado
- Screen contracts de pantallas nuevas
- Estados no felices
- Criterio mobile
- Copy crítico del CTA o feedback

### Heurísticas para este producto

La app de intercambio de cromos debe favorecer:

- Rapidez para entender faltantes y repetidos
- Confianza para compartir o escanear un QR
- Uso en móvil y en contexto presencial
- Decisiones rápidas con poca carga cognitiva

Preguntas guía:

- ¿Qué le falta a esta persona?
- ¿Yo tengo algo que le sirva?
- ¿Cómo propongo el cambio en segundos?
- ¿Qué pasa después de enviar la propuesta?

### Definition of Done UX

Una feature nueva no está lista si falta alguno de estos puntos:

- Hay screen contract para pantallas o flujos nuevos
- Existe CTA principal claro
- Existen estados `empty`, `loading`, `error` y `success` cuando aplican
- Se pensó el caso mobile
- El copy crítico no es genérico
