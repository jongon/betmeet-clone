# Next.js Dev Container Skill

Deploy, develop, and debug a Next.js application using Docker multi-container Dev Container architecture.

## USE FOR
- Setting up local development environment
- Debugging Next.js with VS Code attach mode
- Understanding multi-container Docker architecture
- Managing the devcontainer/app/postgres/pnpm services

## DO NOT USE FOR
- Deployment to Vercel (handled separately)
- Database schema design (use Prisma workflows)
- Production Docker configuration

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Docker Network (nextjs)          │
│                                         │
│  devcontainer ──attach──► app           │
│  (VS Code IDE)            (next dev)    │
│                          :3000 :9229    │
│                                         │
│  pnpm ◄──────────────────┐              │
│  (install deps)           │              │
│                          ▼              │
│                      postgres           │
│                      :5432              │
└─────────────────────────────────────────┘
```

---

## Quick Start

### 1. Build and start services
```bash
docker compose up -d
```

### 2. Wait for pnpm to finish installing dependencies
```bash
docker compose logs -f pnpm
```

### 3. Open VS Code in Dev Container
```
View > Command Palette > "Dev Containers: Reopen in Container"
```

### 4. Attach debugger
```
F5 > "Next.js: debug (attach)"
```

### 5. Open browser
```
http://localhost:3000
```

---

## Services

### devcontainer
- VS Code IDE + debugger client
- Attaches to `app` service for debugging
- Runs with features from `devcontainer.json`

### app
- Next.js development server
- Ports: 3000 (HTTP), 9229 (debugger)
- Runs `pnpm dev --inspect=0.0.0.0:9229`

### postgres
- PostgreSQL 18 alpine
- Port: 5432
- Data volume: `nextjs-postgres:/var/lib/postgresql`

### pnpm
- Dependency installer
- Executes `pnpm install` then exits
- Shares pnpm store volume with other services

---

## Debugging

### VS Code Configuration (`.vscode/launch.json`)
```json
{
  "name": "Next.js: debug (attach)",
  "type": "node",
  "request": "attach",
  "address": "nextjs-app",
  "port": 9229,
  "localRoot": "${workspaceFolder}",
  "remoteRoot": "/var/www/html"
}
```

### Debug Flow
1. Ensure `app` container is running
2. VS Code connects to `nextjs-app:9229` via attach mode
3. Set breakpoints in VS Code
4. Browser requests hit `localhost:3000`

---

## Common Commands

### Start environment
```bash
docker compose up -d
```

### Stop environment
```bash
docker compose down
```

### Rebuild images
```bash
docker compose up -d --build
```

### View logs
```bash
docker compose logs -f app
docker compose logs -f postgres
```

### Clean volumes
```bash
docker compose down -v
```

### Access PostgreSQL
```bash
docker compose exec postgres psql -U username -d nextjs
```

---

## Environment Variables

### Required in `.env`
```env
APP_PORT=3000
DEBUG_PORT=9229
DB_DATABASE=nextjs
DB_USERNAME=username
DB_PASSWORD=password
FORWARD_DB_PORT=5432
DATABASE_URL=postgresql://username:password@localhost:5432/nextjs
```

### Optional (Supabase)
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Service definitions |
| `.devcontainer/Dockerfile` | Multi-stage build (base, devcontainer, app, pnpm) |
| `.devcontainer/devcontainer.json` | VS Code Dev Container config |
| `.vscode/launch.json` | Debugger attach configuration |
| `.env` | Environment variables |

---

## Troubleshooting

### App won't start
```bash
docker compose logs app
```

### pnpm install fails
```bash
docker compose logs pnpm
docker compose down -v
docker compose up -d
```

### Debugger won't attach
- Verify `app` is running: `docker compose ps`
- Check port 9229 is exposed: `docker port nextjs-app`
- Verify VS Code is in Dev Container mode

### Database connection fails
```bash
docker compose exec postgres pg_isready -U username
```

---

## Prisma Commands

```bash
# Generate Prisma client
docker compose exec app npx prisma generate

# Run migrations
docker compose exec app npx prisma migrate dev

# Open Prisma Studio
docker compose exec app npx prisma studio
```