# Unit 13 — Refine de Invitaciones y Entrada a Ligas · Functional Design

> Refine post-construcción. Refina Unit 3 (pools/membership) y las integraciones de
> Unit 10 (invitaciones dirigidas + push). **No reinicia** Units aprobadas.
> Cubre FR-REFINE-13.1 … 13.6 y la Épica 12 (US-12.1 … US-12.5). Español (AGENTS.md).

## 1. Estado del código existente (qué ya está y qué falta)

| FR-REFINE | Estado actual | Trabajo en Unit 13 |
|-----------|---------------|--------------------|
| 13.1 Preservar destino en auth | `proxy.ts` redirige a `/sign-in` **sin** `next`; `signIn`/`signUp` van fijo a `/matches`; `auth/callback` y `auth/confirm` **ya leen** `next` | Propagar `next` por proxy → sign-in/sign-up → callback/confirm |
| 13.2 Onboarding antes de invitación | Onboarding ya preserva `next` (Unit 12); proxy gatea a onboarding **sin** `next` | Proxy pasa `next` al redirigir a onboarding |
| 13.3 Confirmación explícita | `JoinConfirm` ya exige clic; no hay auto-join por link | Sin cambio funcional; se documenta y prueba |
| 13.4 Invitaciones dirigidas | **Ya implementado** (Unit 10): `create-directed-invite` resuelve nickname/email y encola push solo si el destinatario existe | Verificar/probar; sin reescritura. **Unit 45 (2026-06-18)**: gate ampliado con `isOwner || (PRIVATE && membersCanInvite)`. |
| 13.5 Join público exitoso | `joinPublicPool` devuelve `{ success }`; el card no redirige | Redirigir directo a `/pools/[id]` al unirse |
| 13.6 Ya miembro en público | `joinPublicPool` trata "ya miembro" como **error fatal** | Convertir en estado informativo, permanecer en el directorio |

## 2. Decisiones de diseño

### Cadena de preservación de `next` (13.1 / 13.2)
Se reutiliza el helper `sanitizeNext` (creado en Unit 12, anti open-redirect):

1. **`proxy.ts`** — al redirigir a un usuario no autenticado, adjunta
   `?next=<pathname+search>` (codificado). Al gatear a onboarding, propaga el
   `next` original (o el pathname actual) a `/onboarding/profile?next=…`.
2. **`/sign-in`** — la página lee `next` de `searchParams` y lo pasa a
   `SignInForm` (input hidden), `GoogleSignInButton` y `PasskeySignInButton`.
3. **`signIn` / `signUp` actions** — redirigen a `sanitizeNext(next)` en vez de
   `/matches` fijo. `signUp` redirige a `/verify-email` conservando `next` para
   después de confirmar.
4. **Google OAuth** — `initiateGoogleSignIn(next?)` fija el `redirectTo` de OAuth a
   `/auth/callback?next=<next>`. `auth/callback` ya redirige a `next`.
5. **Confirmación de email** — el enlace del template ya soporta `?next=`;
   `auth/confirm` ya lo respeta. Para sign-up con invitación, se incluye `next`.
6. **Onboarding** — sin cambios (ya implementado en Unit 12): al terminar continúa
   a `next` válido o `/matches`.

**Seguridad**: todo `next` pasa por `sanitizeNext` (solo rutas internas; bloquea
`//host`, URLs externas y backslash). Nunca se confía en `next` crudo para redirigir.

### Confirmación explícita (13.3)
La ruta `/pools/join/[token]` vive en el grupo `(app)` (gateada por el proxy). Tras
auth + onboarding, el usuario aterriza en `JoinConfirm`, que **exige** pulsar
"Unirme". No se introduce auto-join. Se cubre con pruebas de que ningún flujo de
auth llama a `joinPoolByToken` automáticamente.

### Join público exitoso (13.5)
`joinPublicPool` devolverá `{ success: true, poolId }`. `PoolPreviewCard` (cliente)
hará `router.push('/pools/'+poolId)` al éxito, redirigiendo directo a la liga.
Alternativa equivalente: `redirect()` dentro de la action; se elige el push en
cliente para conservar el manejo de error/estado del card.

### Ya miembro en público (13.6)
"Ya miembro" deja de ser `error`. `joinPublicPool` devolverá
`{ alreadyMember: true, poolId }`. El card mostrará un mensaje informativo
(no destructivo) y un enlace "Ir a la liga", permaneciendo en el directorio. El
resto de errores (lleno, no encontrado) siguen como error.

> **Unit 63 (2026-06-23) — estado proactivo pre-clic (extiende FR-REFINE-13.6)**: el directorio `/pools/discover` ahora anota `isMember` por pool para el usuario actual (query batched en `listPublicPools`), de modo que `PoolPreviewCard` muestra **directamente** un botón outline «Ir a la liga» en los pools a los que ya pertenezco, **sin** necesidad de pulsar «Unirme» para descubrirlo. El flujo reactivo de 13.6 (mensaje `alreadyMember` + enlace tras un clic en un card stale) **se conserva** como red de seguridad ante una race (p. ej. unirse en otra pestaña con `isMember` desactualizado hasta el siguiente `router.refresh()`). La action `joinPublicPool` y su contrato `{ alreadyMember }` no cambian. Ver `construction/unit-63-pools-discover-joined-state/functional-design.md`.

### Invitaciones dirigidas (13.4) — ya cubierto
`create-directed-invite` (Unit 10) ya: valida nickname `base#disc` y email,
resuelve al usuario destino, persiste `PoolDirectedInvite` y encola push
**solo** cuando el destinatario se resuelve a un usuario existente, manteniendo el
link/código genérico. Unit 13 **verifica** este comportamiento con pruebas; sin
reescritura. Si la verificación detecta un hueco (p. ej. push disparado sin
destinatario), se corrige puntualmente.

> **Unit 44 (2026-06-18)**: `DirectedInviteForm` gana autocompletar de nickname (búsqueda por `startsWith` sobre `nicknameBase`). El server action `createDirectedInvite` y el flujo de resolución/push no cambian. Ver `construction/unit-44-nickname-autocomplete-invite/`.

> **Unit 45 (2026-06-18) — supersede de FR-REFINE-44.7**: el comportamiento de "cualquier miembro puede invitar" introducido en Unit 44 (corrección del usuario) queda **restringido** por el nuevo toggle `Pool.membersCanInvite`. Regla final: el owner del pool siempre puede invitar; los miembros no-owner solo pueden invitar si `pool.type === "PRIVATE" && pool.membersCanInvite === true`. El server action `createDirectedInvite` (Unit 10) recibe este gate ampliado (BR-3.34). El flujo de resolución (`resolveUserByTarget`), el push (`queueNotificationEvent`) y la persistencia en `PoolDirectedInvite` no cambian. El `DirectedInviteForm` (UI, Unit 13 + Unit 44) se renderiza condicionalmente según el flag (visible para owner siempre; para miembros no-owner solo si `PRIVATE && membersCanInvite`). Ver `construction/unit-45-pool-member-invites-permission/`.

## 3. Contratos (nuevos / modificados)

| Símbolo | Tipo | Cambio |
|---------|------|--------|
| `proxy.ts` | mod | `?next=` en redirect a `/sign-in` y a onboarding |
| `signIn` | mod | param/campo `next` → `redirect(sanitizeNext(next))` |
| `signUp` | mod | conserva `next` hacia `/verify-email` y confirmación |
| `initiateGoogleSignIn` | mod | acepta `next`, lo pasa a `redirectTo` |
| `SignInForm` / sign-in page | mod | propaga `next` (hidden + a botones OAuth/passkey) |
| `joinPublicPool` | mod | `{ success, poolId }` / `{ alreadyMember, poolId }` (no error) |
| `PoolPreviewCard` | mod | redirige al éxito; muestra info si ya es miembro |

## 4. Estados y accesibilidad
- Mensajes en español; estados carga/error/info diferenciados (info ≠ error).
- `next` nunca visible como dato sensible; solo rutas internas.

## 5. Schema / Infra
- **Sin cambios de schema.** Sin infra nueva. (Las invitaciones dirigidas y su
  tabla ya existen desde Unit 10.)

## 6. Plan de archivos (para Code Generation)
- `src/proxy.ts` (mod: `next` en redirects)
- `src/features/auth/actions/sign-in.ts`, `sign-up.ts`, `google-callback.ts` (mod)
- `src/app/(auth)/sign-in/page.tsx`, `sign-up/page.tsx` (mod: leer/propagar `next`)
- `src/features/auth/components/sign-in-form.tsx`, `google-sign-in-button.tsx`,
  `passkey-sign-in-button.tsx` (mod: aceptar `next`)
- `src/features/pools/actions/join-public-pool.ts` (mod)
- `src/features/pools/components/pool-preview-card.tsx` (mod)
- Tests: preservación de `next` (proxy/sign-in), anti open-redirect, join público
  (éxito redirige, ya-miembro informativo), verificación de invitaciones dirigidas.

## 7. Verificación (criterios de "hecho")
- `tsc` 0, Biome/ESLint limpios, Vitest verde, `next build` OK.
- Un link de invitación abierto sin sesión vuelve al destino tras login /
  sign-up / Google / confirmación de email / onboarding.
- `sanitizeNext` impide open redirects (probado con `//evil`, `https://…`).
- Join público exitoso aterriza en `/pools/[id]`; ya-miembro informa sin error fatal.
- `src/proxy.ts` conserva su lógica de gate (solo añade `next`); Units 1-12 intactas.
