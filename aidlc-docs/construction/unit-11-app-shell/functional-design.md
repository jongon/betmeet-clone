# Unit 11 — App Shell & Navigation · Functional Design (light)

> Refine UI-only y aditivo. No reinicia Units 1–10. Sin cambios de schema/API.
> Cubre FR-SHELL-01 y la Épica 10 (US-10.1 … US-10.6).

## 1. Estrategia de montaje

Se introduce un **route-group de presentación `(app)`** que aporta el chrome global
sin alterar las URLs. Las páginas autenticadas se mueven dentro del grupo (las URLs
no cambian porque los paréntesis no aparecen en la ruta).

```
src/app/
  (app)/                 ← NUEVO grupo con chrome (header global)
    layout.tsx           ← monta <AppHeader/> + <main>
    matches/page.tsx     ← (movido desde app/matches)
    pools/page.tsx       ← (movido desde app/pools)
    rules/page.tsx       ← (movido desde app/rules)
    settings/...         ← (movido; conserva su sub-nav interna)
    admin/...            ← (movido; conserva su gate notFound())
  (auth)/                ← SIN chrome (sign-in, sign-up, …) — sin cambios
  onboarding/            ← SIN chrome — sin cambios
  page.tsx               ← landing pública — sin cambios (ya tiene sus toggles)
  layout.tsx             ← root: providers — sin cambios
```

**Decisión**: preferir mover las rutas autenticadas al grupo `(app)` frente a
repetir `<AppHeader/>` en cada página. Si mover directorios resultara intrusivo en
la revisión, alternativa equivalente: mantener rutas donde están y montar
`<AppHeader/>` mediante un componente compartido en cada layout de sección
(`settings/layout.tsx`, un nuevo `admin/layout.tsx`, etc.). El grupo `(app)` es la
opción recomendada por DRY. **Confirmar en code-gen si se permite mover archivos.**

## 2. Matriz de cobertura de rutas

| Ruta | ¿Chrome global? | Notas |
|------|-----------------|-------|
| `/` (landing) | No | Pública; ya tiene sus propios toggles |
| `(auth)/*` (sign-in, sign-up, forgot, reset, verify) | No | Flujo de auth sin distracción |
| `/onboarding/*` | No | Flujo guiado; sin nav que invite a salir |
| `/matches` | Sí | Home autenticada |
| `/pools` | Sí | |
| `/rules` | Sí (autenticado) | La landing pública sigue mostrando su versión |
| `/settings/*` | Sí | El header global envuelve la sub-nav de settings existente |
| `/admin`, `/admin/matches` | Sí | + contexto "Admin"; gate `notFound()` intacto |

## 3. Componentes (contratos)

### `AppHeader` (Server Component)
- **Ubicación**: `src/components/layout/app-header.tsx`
- **Datos**: llama `getProfile()` (server) para avatar, nickname y `verificationStatus`.
- **Render**: barra superior sticky con: marca/logo (link `/matches`), `PrimaryNav`,
  y a la derecha `BrandToggle` + `ThemeToggle` + `UserMenu`.
- **Sin sesión**: si `getProfile()` es null (caso borde; el gate de `proxy.ts` no
  debería permitirlo en estas rutas) renderiza un header mínimo con link a `/sign-in`.

### `PrimaryNav` (Client Component)
- **Ubicación**: `src/components/layout/primary-nav.tsx`
- **Props**: `isAdmin: boolean`.
- **Comportamiento**: enlaces Partidos/Ligas/Reglas; usa `usePathname()` para marcar
  `aria-current="page"` en la sección activa. En `< md` colapsa en un menú
  (Sheet/DropdownMenu) accesible por teclado.

### `UserMenu` (Client Component)
- **Ubicación**: `src/components/layout/user-menu.tsx`
- **Props**: `{ avatarUrl, displayNickname, isAdmin }`.
- **UI**: trigger = `Avatar` + nickname; `DropdownMenu` con:
  - Perfil → `/settings/profile`
  - Seguridad → `/settings/security`
  - Admin → `/admin` *(solo si `isAdmin`)*
  - Separador
  - Cerrar sesión → `<form action={signOut}>` con `<button type="submit">`
- **Sign-out**: usa la server action existente `signOut()` (no se crea otra).

### `(app)/layout.tsx` (Server Component)
- Monta `<AppHeader/>` y envuelve `{children}` en `<main>` con el contenedor estándar.
- No duplica gating: la sesión la garantiza `src/proxy.ts`; admin lo garantiza su página.

## 4. Estados

- **Autenticado no-admin**: nav completa, `UserMenu` sin entrada Admin.
- **Autenticado admin**: igual + entrada Admin en `UserMenu`; en `/admin/*` el header
  muestra un distintivo de contexto "Admin" y el logo/regreso lleva a `/matches`.
- **Móvil**: nav primaria colapsada; toggles y `UserMenu` siguen accesibles.
- **Loading/hydration**: `ThemeToggle`/`BrandToggle` ya manejan su placeholder
  anti-hydration; `UserMenu` se hidrata con props del server (sin parpadeo de sesión).

## 5. Accesibilidad
- `aria-current="page"` en el enlace activo.
- Header como `<header>`, nav como `<nav aria-label="Navegación principal">`.
- Foco visible y orden de tabulación lógico; menús operables por teclado (Radix base).
- Contraste AA en las 6 combinaciones marca×tema (consistente con FR-DS-01).

## 6. i18n
- Copy en español vía `@/i18n/dictionaries/es` (añadir claves `nav.*` y `userMenu.*`
  si no existen: Partidos, Ligas, Reglas, Perfil, Seguridad, Admin, Cerrar sesión).

## 7. Plan de archivos (para Code Generation)
- **Nuevos**: `src/app/(app)/layout.tsx`, `src/components/layout/app-header.tsx`,
  `src/components/layout/primary-nav.tsx`, `src/components/layout/user-menu.tsx`,
  claves i18n en `src/i18n/dictionaries/es.ts`.
- **Movidos** (sin cambio de URL): `matches/`, `pools/`, `rules/`, `settings/`,
  `admin/` → bajo `src/app/(app)/`.
- **Sin tocar**: `src/proxy.ts`, root `layout.tsx`, `(auth)/*`, `onboarding/*`,
  `signOut()`, `ThemeToggle`, `BrandToggle`.

## 8. Verificación (criterios de "hecho")
- Tests de componente: `UserMenu` muestra/oculta Admin según `isAdmin`; cerrar
  sesión invoca `signOut`. `PrimaryNav` marca activo por pathname.
- Tipos (`tsc` 0), ESLint 0, Biome limpio, build OK, suite Vitest verde (≥115).
- Verificación manual/e2e: en `/matches`, `/pools`, `/settings/profile` y `/admin`
  se ve avatar+nickname, se cambia tema/marca y se cierra sesión; ausente en
  `/sign-in` y `/onboarding`.
