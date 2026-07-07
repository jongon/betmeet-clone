# Functional Design — Unit 77: El usuario con sesión que entra a `/` es redirigido a `/matches`

> Refine post-construcción (2026-07-07) vía `/aidlc:refine`. **Plan presentado y aprobado
> antes de ejecutar.** Refine sobre la **capa de gating de rutas** (`src/proxy.ts`, el middleware
> de Next 16), en continuación de FR-REFINE-15.3 (landing consciente de sesión) y del redirect
> auth-only → `/matches` ya existente. **No reinicia** etapas aprobadas (Units 1–76).

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-77.1 | requirements | Un visitante **con sesión iniciada** (email confirmado) que entra a la página principal `/` es **redirigido a `/matches`** en lugar de ver el landing. El visitante **anónimo** sigue viendo el landing en `/`. |
| US-77.1 | stories | Como usuario con sesión, al entrar a `/` quiero ir directamente a `/matches` (la app) y no al landing de marketing. |
| FR-REFINE-15.3 | requirements | Landing consciente de sesión: el header del landing mostraba `UserMenu` para el usuario logueado. Unit 77 **supersede su ruta primaria** (el logueado ya no llega al landing); el render session-aware de `page.tsx` se conserva como **degradación elegante** (ver BR-77.4). |
| FR-REFINE-67.1 | requirements | Landing de producto estilo startup. En la práctica pasa a ser **solo para anónimos** (el logueado se redirige antes de renderizarlo). Sin cambios en `page.tsx`. |

## 1. Intención del usuario

Petición del usuario: *"Necesito que si un usuario tiene la sesión iniciada y si entra a la
página principal lo redirija a matches `/matches` y no al landing."*

**Contexto.** `/` (`src/app/page.tsx`) es una ruta **pública** (`PUBLIC_ROUTES` en `src/proxy.ts`)
que renderiza un landing **consciente de sesión**: al usuario logueado le muestra su `UserMenu`
(FR-REFINE-15.3) y al anónimo el landing de producto con sign-in/sign-up y nav de anclas
(FR-REFINE-67). El middleware **ya** redirige las páginas **auth-only** (`/sign-in`, `/sign-up`,
`/forgot-password`, `/verify-email`) a `/matches` para el usuario logueado, pero `/` **no** estaba
en ese grupo, así que el logueado seguía aterrizando en la portada de marketing en lugar de en la
app.

**Objetivo.** Que el usuario con sesión que entra a `/` sea llevado directamente a `/matches`,
manteniendo `/` visible para los anónimos.

## 2. Business Rules

| ID | Regla | Trazabilidad |
|---|---|---|
| **BR-77.1** | En `src/proxy.ts`, un usuario **autenticado y con email confirmado** que solicita exactamente `pathname === "/"` es **redirigido (307) a `/matches`**. Se reutiliza el mismo bloque que ya redirige las rutas auth-only, ampliando su condición a `isAuthOnly(pathname) OR pathname === "/"`. | FR-REFINE-77.1 |
| **BR-77.2** | `/` permanece en `PUBLIC_ROUTES`: el **visitante anónimo** sigue viendo el landing sin cambios. El redirect **solo** aplica cuando hay sesión viva (`isAuthenticated`). | FR-REFINE-77.1 |
| **BR-77.3** | Se respeta la **excepción MFA-pending** heredada del bloque auth-only: una sesión aal1 que aún debe completar el reto TOTP **no** se redirige (para `/` esto simplemente conserva el comportamiento actual: ve el landing hasta completar el 2FA). | BR-77.1 |
| **BR-77.4** | El render **session-aware** de `page.tsx` (FR-REFINE-15.3: `getProfile()` → `UserMenu`) **no se elimina**: se conserva como **degradación elegante / defensa en profundidad** para el caso residual de una sesión aal1-pending o de un eventual bypass del middleware. La autoridad de la redirección vive en `proxy.ts` (convención del proyecto: *"Session/email/admin gating lives in src/proxy.ts"*). | FR-REFINE-15.3 |
| **BR-77.5** | **Orden de gates preservado.** El redirect de `/` se ubica **después** del gate de email confirmado (una sesión no confirmada que entra a `/` —ruta pública— sigue su curso hacia `/verify-email` cuando intenta una ruta no pública; no se la manda a `/matches`) y **antes** del gate de onboarding (un usuario confirmado sin onboarding encadena `/` → `/matches` → `/onboarding/profile`, idéntico a como ya se comporta `/sign-in`). | BR-77.1 |

## 3. Business Logic Model

### BL-77.1: `proxy.ts` — redirect de `/` para sesión viva

```
# (contexto previo del middleware, sin cambios)
#   - rutas /api/ → passthrough
#   - getClaims() → isAuthenticated, emailConfirmed, onboarding_completed
#   - account_deleted → signOut + /sign-in
#   - !isAuthenticated && !isPublic → /sign-in?next=…
#   - isAuthenticated && !emailConfirmed && !isPublic → /verify-email

# CAMBIO (BR-77.1): la condición del redirect auth-only también cubre "/"
if isAuthenticated AND (isAuthOnly(pathname) OR pathname === "/"):
    aal = supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    mfaPending = aal.nextLevel === "aal2" AND aal.nextLevel !== aal.currentLevel
    if NOT mfaPending:                                  # BR-77.3
        return redirect("/matches")                     # BR-77.1

# (gate de onboarding posterior, sin cambios)
#   - isAuthenticated && !isPublic && pathname !== /onboarding/profile
#     && onboarding_completed === false → /onboarding/profile?next=…
```

Matriz de comportamiento en `/`:

| Sesión | Estado | Resultado en `/` |
|---|---|---|
| Anónima | — | Landing (público, sin cambios) — BR-77.2 |
| Autenticada | Email sin confirmar | Landing (`/` es público); al intentar la app se la gatea a `/verify-email` — BR-77.5 |
| Autenticada | aal1 MFA-pending | Landing (excepción MFA, comportamiento actual) — BR-77.3 |
| Autenticada | Confirmada, sin onboarding | `/` → `/matches` → `/onboarding/profile` — BR-77.5 |
| Autenticada | Confirmada + onboarded | `/` → `/matches` — BR-77.1 |

## 4. Contratos / cambios de código

| Archivo | Cambio |
|---|---|
| `src/proxy.ts` | Condición del bloque de redirect auth-only ampliada de `isAuthenticated && isAuthOnly(pathname)` a `isAuthenticated && (isAuthOnly(pathname) || pathname === "/")` (BL-77.1). Comentario actualizado. Reutiliza el guard MFA-pending y el único `NextResponse.redirect(new URL("/matches", request.url))` ya existentes. |

### Sin cambios
- `src/app/page.tsx`: el render session-aware (FR-REFINE-15.3) se conserva como fallback (BR-77.4);
  no se toca. `PUBLIC_ROUTES` / `AUTH_ONLY_ROUTES` / `isPublic` / `isAuthOnly` sin cambios (`/`
  permanece público; **no** se añade a `AUTH_ONLY_ROUTES` para no distorsionar su semántica de
  "solo flujo de auth").
- Sin schema, migraciones, RLS, triggers, rutas nuevas, server actions ni i18n.

### Fuera de alcance
- Cambiar el destino del redirect (siempre `/matches`, consistente con el redirect auth-only).
- Retirar o refactorizar el render session-aware de `page.tsx` (se conserva a propósito, BR-77.4).

## 5. Security Baseline Compliance

| Regla | Estado | Razón |
|---|---|---|
| SECURITY (input surface) | **COMPLIANT** | No añade superficie de input, schema, migraciones, rutas ni server actions. Solo amplía una condición de redirect existente en el middleware. |
| Gating de sesión | **COMPLIANT — sin regresión** | El redirect solo aplica a sesiones vivas; los gates de account-deleted, email-confirmado, MFA-pending y onboarding preexistentes se conservan y su orden se respeta (BR-77.5). Una sesión aal1 no gana acceso nuevo: el middleware ya permitía a aal1 alcanzar `/matches` directamente; este cambio no abre superficie adicional. |
| Verificación local del JWT | **COMPLIANT** | Se reutiliza `getClaims()` (verificación asimétrica local) ya presente; sin round-trips nuevos salvo el `getAuthenticatorAssuranceLevel()` que el mismo bloque auth-only ya ejecutaba. |

## 6. Stages
- **Requirements / User Stories**: EXECUTE (Épica 77 / FR-REFINE-77.1, US-77.1).
- **Functional Design**: EXECUTE (este documento).
- **Code Generation**: EXECUTE (`src/proxy.ts`).
- **Build and Test**: EXECUTE (`pnpm build` + `pnpm check`; trazado manual de las ramas del proxy — no existe harness de test del middleware, consistente con Unit 66).
- **SKIP**: Reverse Engineering, Units Generation, NFR Requirements/Design, Infrastructure, **Application Design** (refine sin nuevo unit-of-work; sin schema/migraciones/rutas/i18n nuevos, igual que Units 70–76).

## 7. Verificación

- `pnpm build` (incluye `tsc`) OK / `pnpm check` (Biome) limpio en `src/proxy.ts`.
- Trazado manual de `proxy.ts` (ver matriz en BL-77.1): anónimo en `/` → landing; logueado
  confirmado en `/` → `/matches`; logueado sin onboarding en `/` → `/matches` → `/onboarding/profile`;
  aal1 MFA-pending en `/` → landing (excepción); no confirmado en `/` → landing público (gate a
  `/verify-email` al intentar la app).
- No existe test harness del middleware en el repo (`src/proxy.ts` no tiene `.test.ts`),
  consistente con Unit 66 (no hay tests de página/proxy que extender). Sin commit/push.

## Primary Deliverable
Al entrar a `/` con la sesión iniciada (email confirmado, onboarding hecho), la app te lleva
directamente a `/matches`; el visitante anónimo sigue viendo el landing en `/`.
