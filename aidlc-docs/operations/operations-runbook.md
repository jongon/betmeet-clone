# Operations Runbook — Inicialización de entorno, schema y seed

> **Fase**: OPERATIONS. Documenta el procedimiento operativo para dejar un entorno
> (prod o nuevo) funcional: variables, creación de schema, datos iniciales y
> habilitación del administrador. Surgió del trabajo de la sesión 2026-06-11 al
> intentar poblar el proyecto Supabase de producción `ybilxazlmkhjisybdxub`.
>
> Deploy de runtime (Vercel + Supabase) está en
> `construction/unit-1-foundation/infrastructure-design/deployment-architecture.md`.
> Este runbook cubre la **inicialización de datos/schema**, no descrita hasta ahora.

---

## 0. Hallazgos que motivaron este runbook

| # | Hallazgo | Impacto |
|---|---|---|
| H-1 | El proyecto Supabase de prod estaba **vacío de schema** (sin tablas `public.*`, sin trigger). | El seed y `seed-admin` fallan con `relation does not exist` / `TableDoesNotExist`. |
| H-2 | Las migraciones `supabase/migrations/0001–0010` **solo** hacen `ENABLE RLS` + `CREATE POLICY` + triggers sobre tablas que **asumen creadas por Prisma**. Solo `0011` (notificaciones) hace `CREATE TABLE`, duplicando modelos que también están en `prisma/schema.prisma`. | No existía un paso documentado que **cree las tablas base**. Ver [CF-6](../inception/carry-forward-decisions.md). |
| H-3 | `NEXT_PUBLIC_SUPABASE_URL` estaba **comentada** y apuntaba a otro proyecto (`ghqbquxxqvryrjdcjdri`) distinto al del `SERVICE_ROLE_KEY`/`DATABASE_URL` (`ybilxazlmkhjisybdxub`). | `seed-admin`/`seed-avatars` (Admin API de Supabase) fallan con "Missing required environment variables" o apuntan al proyecto equivocado. |
| H-4 | `scripts/seed-competition.ts` usaba **top-level await**; con `tsx` y sin `"type":"module"` se transpila a CJS y rompe. | Corregido: envuelto en `async function main()` (mismo patrón que `seed-admin.ts`/`seed-avatars.ts`). |
| H-5 | El usuario admin se creó en `Authentication → Users` **antes** de existir la tabla `profiles` y el trigger `handle_new_user`. | El trigger solo dispara en *nuevos* inserts → **no hay fila en `profiles`** para ese usuario → `seed-admin` (que hace `UPDATE`) falla. |
| H-6 | `DATABASE_URL` usa el **transaction pooler** (`...pooler.supabase.com:6543`). | Correcto para runtime. Operaciones DDL (`prisma db push` / `migrate deploy`) deben usar `DIRECT_URL` con la **direct connection** (`db.<ref>.supabase.co:5432`). |
| H-7 | `.env` contiene `SUPABASE_SERVICE_ROLE_KEY`, el password de la BD y `API_FOOTBALL_KEY` en texto plano. | Riesgo de credenciales. Confirmar `.env` en `.gitignore` y **rotar** secretos expuestos. |
| H-8 | Con **PostgREST caído** (`PGRST002 – "Could not query the database for the schema cache"`), el gate de auth en `src/proxy.ts` —único punto que lee tablas vía REST de Supabase; el resto va por Prisma— recibía `{data:null}` y lo trataba como "sin nickname" → redirige a `/onboarding/profile`, que (vía Prisma sí ve el nickname) rebota a `/matches` → **loop infinito** (`Throttling navigation` + pantalla negra). Detectado 2026-06-12. | Mitigado en código: el middleware ahora hace *fail-open* ante error de lectura (`!error && !profile?.nickname_base`). La causa raíz (PostgREST degradado) se resuelve reiniciando el servicio en Supabase. Ver §6. |

---

## 1. Variables de entorno

Referencia: `.env.example`. Por entorno:

| Variable | Runtime | Migraciones/seed | Notas |
|---|---|---|---|
| `DATABASE_URL` | pooler `:6543` | seeds runtime/idempotentes | Usada por Prisma Client en la app y scripts de seed. |
| `DIRECT_URL` | — | direct `:5432` | Usada por `prisma.config.ts` para Prisma CLI/migraciones. |
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ (`seed-admin`, `seed-avatars`) | Debe ser **del mismo proyecto** que el service role key (H-3). |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | ✓ | Solo servidor; nunca al cliente. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | — | Del mismo proyecto. |
| `API_FOOTBALL_KEY` | sync admin | — (seed estático no lo usa) | `seed:competition` es upsert estático, no llama a la API. |
| `NEXT_PUBLIC_SITE_URL`, `WORLD_CUP_KICKOFF`, `VAPID_*` | ✓ | — | Ver Unit 9/10. |

---

## 2. Crear el schema (paso que faltaba — ver H-2 / CF-6)

Schema gestionado con **migraciones Prisma versionadas** (CF-6 aprobado e implementado):

- `prisma/migrations/20260609000000_init/` — baseline: tablas/enums/índices/FKs desde `schema.prisma`.
- `prisma/migrations/20260611120000_rls_constraints_triggers/` — RLS, policies, CHECK,
  índices parciales/compuestos, triggers y policies de Storage (portado de las antiguas
  `supabase/migrations/*.sql`, ya eliminadas del repo; historial en git).

Pasos en una BD nueva/vacía:

1. **Crear el bucket de Storage `avatars`** en Supabase (Dashboard/`config.toml`): la
   migración de RLS y `scripts/seed-avatars.ts` lo asumen existente.
2. **Aplicar migraciones** con `DIRECT_URL` apuntando a la *direct connection* (`:5432`, H-6), no el pooler:
   ```bash
   npx prisma migrate deploy
   ```
   Esto crea tablas y luego aplica RLS/triggers/Storage en orden.

> **Validación previa (2026-06-11)**: ambas migraciones se probaron en una BD temporal
> local con stubs de `auth`/`storage`. Resultado: aplican sin error, `prisma migrate diff`
> = **0 drift** vs `schema.prisma`, seed OK, 16 tablas con RLS. Falta solo `migrate deploy`
> contra prod.

---

## 3. Seed de datos iniciales

```bash
pnpm seed:competition     # Mundial 2026: competición, fases, equipos, partidos (upsert, idempotente)
pnpm sync:flags           # descarga/reemplaza banderas SVG requeridas desde lipis/flag-icons
pnpm check:flags          # verifica banderas SVG por equipo (CF-2/CF-3)
# Opcional — requiere bucket 'avatars' + scripts/avatars/ con imágenes:
pnpm tsx scripts/seed-avatars.ts
```

- `seed:competition` solo necesita `DATABASE_URL`; Prisma conecta como owner, RLS no lo bloquea.
- Pertenece a **Unit 4 (Competition Data)**; el catálogo de selecciones/banderas a CF-2/CF-3.
- `sync:flags` no requiere credenciales; descarga los SVG de `lipis/flag-icons` a `public/flags/` y debe ejecutarse cuando cambie el seed de equipos.

---

## 4. Habilitar el usuario administrador (Unit 7)

`scripts/seed-admin.ts` recibe un **email** (no user-id), busca el usuario por la Admin API
de Supabase y hace `UPDATE profiles SET verification_status = 'ADMIN'`.

Prerrequisitos:
1. El usuario debe existir en `auth.users` **y tener fila en `profiles`**. Esa fila la crea
   el trigger `handle_new_user` al registrarse → el usuario debe registrarse (o recrearse)
   **después** de que el trigger exista (H-5). Si ya existía antes, insertar su fila en
   `profiles` manualmente o borrar/recrear el usuario en Auth.
2. `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` del proyecto correcto (H-3).

```bash
pnpm tsx scripts/seed-admin.ts <email>
# Esperado: ✓ <email> promoted to ADMIN
```

Verificar: en `profiles`, `verification_status = 'ADMIN'`; y acceso a `/admin` en la app.

---

## 5. Checklist de readiness para un entorno nuevo

- [ ] `.env` con todas las vars del proyecto correcto; `.env` en `.gitignore`; secretos rotados (H-7).
- [ ] Schema creado (Prisma) + RLS/triggers aplicados (§2).
- [ ] Bucket de Storage `avatars` creado.
- [ ] `pnpm seed:competition` OK + `pnpm sync:flags` ejecutado si cambió el seed + `pnpm check:flags` sin faltantes.
- [ ] Admin registrado (con trigger ya presente) y promovido a ADMIN.
- [ ] Conexión de runtime por pooler; migraciones por direct connection.

---

## 6. Troubleshooting — loop de onboarding / PostgREST `PGRST002` (H-8)

**Síntoma:** tras login/onboarding, la app intenta ir a `/matches` pero queda en
pantalla negra; la consola del browser muestra `Throttling navigation to prevent the
browser from hanging`. El usuario rebota indefinidamente entre `/matches` y
`/onboarding/profile` aunque su `nickname_base` ya esté en la BD.

**Causa:** el servicio **PostgREST** (REST API de Supabase) está degradado y devuelve
`503 PGRST002`. La **BD en sí está sana** (Prisma por el pooler sigue leyendo/escribiendo);
solo la capa REST falla. El único consumidor de REST sobre tablas es el gate del middleware
(`src/proxy.ts`, lee `profiles.nickname_base`); todo lo demás usa Prisma.

**Diagnóstico (confirmar antes de tocar nada):**
```bash
# ¿REST caída? (anon key); 503/PGRST002 = PostgREST degradado
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/profiles?select=id&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
# ¿BD sana por Prisma? (debe responder OK aunque la REST falle)
node --env-file=.env --import tsx -e 'import {prisma} from "@/lib/prisma"; \
  console.log(await prisma.$queryRawUnsafe("select count(*) from public.profiles")); await prisma.$disconnect()'
```

**Solución:**
1. **Reiniciar PostgREST** en el dashboard de Supabase: Settings → General → *Restart
   project* (o *Pause/Resume*). `NOTIFY pgrst, 'reload schema'` / `'reload config'` por SQL
   **no** lo recupera si el servicio está caído (probado, sin efecto).
2. Si persiste, es incidente de plataforma de Supabase (revisar status.supabase.com / soporte).
3. **No** confundir con la caché de Turbopack corrupta (otro origen de pantalla negra en
   dev): esa se arregla con `rm -rf .next` y reiniciar `pnpm dev`.

**Resiliencia ya en código:** el gate de `src/proxy.ts` solo redirige a onboarding cuando
el read tuvo éxito y el nickname está realmente vacío. Ante error de lectura hace fail-open,
de modo que un hipo de PostgREST ya no atrapa a todos los usuarios en el loop.

---

## Decisiones / pendientes

- **CF-6** (transversal): estrategia de migraciones — Prisma migrations versionadas. **Aprobada e implementada**; pendiente aplicar en prod.
- **CF-2/CF-3**: banderas SVG locales completadas el 2026-06-11 con `pnpm sync:flags`; `pnpm check:flags` valida 48/48 assets.
