# Stack

## Frontend
- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript
- **Package Manager**: pnpm

## Design System
- **Estilos**: Tailwind CSS v4 — configuración CSS-first, sin `tailwind.config.*`
- **UI Components**: shadcn/ui (`style: base-nova`, `baseColor: neutral`, `iconLibrary: lucide`, `cssVariables: true`)
- **Flags**: react-world-flags (banderas de selecciones)
- **Config**: `components.json` + tokens en `src/app/globals.css`
- **Dark mode**: next-themes (`attribute="class"`, `defaultTheme="system"`)

### Identidad visual — tokens oklch

| Token CSS | Valor (light) | Semántica |
|-----------|---------------|-----------|
| `--primary` | `oklch(0.349 0.072 251)` | Azul FIFA #1A3C5E — color principal |
| `--brand` | `oklch(0.612 0.208 22)` | Rojo del Mundial #E63946 — CTAs activos |
| `--background` | `oklch(0.969 0.006 106)` | Crema #F5F5F0 — fondo light |
| `--destructive` | `oklch(0.577 0.245 27.3)` | Rojo error #DC2626 |

Regla: usar siempre `bg-primary`, `text-brand`, etc. — nunca valores literales en componentes.

### Tipografía

| Variable | Fuente | Uso |
|----------|--------|-----|
| `--font-display` | Sora | Titulares y headings (`h1`–`h6`), tracking `-0.02em` |
| `--font-sans` | Inter | Texto de cuerpo general |
| `--font-mono` | Geist Mono | Código |

Clase especial: `.label-stadium` — display, `text-transform: uppercase`, `letter-spacing: 0.12em`, `font-weight: 600`. Para etiquetas de estadio / categoría.

### Componentes base instalados (shadcn/ui)

`button` · `card` · `input` · `label` · `badge` · `tabs` · `dialog` · `dropdown-menu` · `switch` · `separator` · `avatar` · `tooltip` · `sonner`

## Backend / Database
- **Base de datos**: PostgreSQL 18 (via Docker)
- **ORM**: Prisma
- **Auth**: Supabase Auth (futuro)

## Infrastructure
- **Container Runtime**: Docker + Docker Compose
- **Desarrollo**: Dev Containers (VS Code)
- **Deployment**: Vercel (frontend), Supabase (database)

## Herramientas de desarrollo
- **IDE**: VS Code con Dev Containers
- **Debugger**: Node.js inspector (attach mode)
- **CLI Tools**: gh, git, fzf, ripgrep, lazygit
- **Shell**: zsh + oh-my-zsh

## Extensiones VS Code recomendadas
- Tailwind CSS IntelliSense
- Supabase VS Code
- Prisma
- ESLint
- Prettier
- GitHub Copilot
- GitLens
