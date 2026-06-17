# Liga Mundial 2026

Plataforma de predicciones deportivas para el FIFA World Cup 2026. Los usuarios se registran, crean o se unen a ligas, predicen resultados de partidos y compiten en rankings con puntuación determinística.

## ¿Cómo funciona?

1. **Registro** con email, Google, passkeys o MFA. Perfil con nickname `usuario#1234` y avatar.
2. **Ligas** públicas o privadas (hasta 100 miembros). Cada liga tiene su propio ranking.
3. **Predicciones** de resultado exacto por partido, editables hasta el inicio del partido. En fases knockout se predice también el ganador en penales.
4. **Puntuación**: 5 pts (resultado exacto), +2 pts (ganador correcto, acumulable), +1 pt por cada equipo acertado, +1 bonus penales.
5. **Rankings** por liga con posiciones empatadas en tiempo real.

## Tech Stack

Next.js 16 · TypeScript · Tailwind CSS v4 · Supabase (Auth + DB + Storage) · Prisma 7 · shadcn/ui

## Requisitos

- Node.js 24+
- pnpm
- Cuenta en [Supabase](https://supabase.com) (gratuita)
- (Opcional) Docker para desarrollo con devcontainer

## Quickstart

```bash
# 1. Clonar e instalar
git clone <repo-url> && cd <repo>
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env
# Completar con tus credenciales de Supabase

# 3. Generar cliente Prisma
pnpm prisma:generate

# 4. Sincronizar migraciones en Supabase (via CLI o Dashboard)
# Las migraciones SQL están en supabase/migrations/

# 5. Seed de datos
pnpm seed:competition

# 6. Iniciar
pnpm dev
# → http://localhost:3000
```

### Promover un admin

```bash
npx tsx scripts/seed-admin.ts <user-id>
```

## Comandos

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm test` | Tests unitarios (Vitest) |
| `pnpm lint` | ESLint |
| `pnpm check` | Biome check |
| `pnpm format` | Biome format (auto-fix) |

## Desarrollo con Docker

```bash
docker compose up -d              # Iniciar servicios
docker compose logs -f pnpm       # Esperar instalación
docker compose exec app pnpm prisma:generate
# VS Code → "Dev Containers: Reopen in Container"
```

## Documentación

- [Project](docs/PROJECT.md) — funcionalidades, estructura, setup
- [Stack](docs/STACK.md) — stack técnico detallado
- [Architecture](docs/ARCHITECTURE.md) — arquitectura, capas, rutas, RLS
- [Workflows](docs/WORKFLOWS.md) — comandos, seed, Supabase, deploy
