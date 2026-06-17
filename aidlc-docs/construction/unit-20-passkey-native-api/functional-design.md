# Unit 20 — Passkeys con la API nativa de Supabase · Functional Design

> Refine post-construcción (2026-06-14). **No reinicia** Units 1–19; ajusta el
> mecanismo técnico de registro/login con passkey (Unit 1 Foundation / Unit 2
> Onboarding). Cubre FR-REFINE-20.1 y la **Épica 19**. Refine de US-1.3.

## 1. Alcance y trazabilidad

| Historia | FR-REFINE | Naturaleza | Resultado |
|----------|-----------|------------|-----------|
| US-19.1 (refine de US-1.3) | 20.1 | mecanismo auth (passkey) | Registrar/usar passkeys deja de fallar con "MFA enroll is disabled for WebAuthn" |

## 2. Problema observado

En el onboarding, al pulsar "Register passkey" el flujo fallaba con
**"MFA enroll is disabled for WebAuthn"** (mensaje emitido por el servidor de
Supabase Auth / GoTrue, no por el código de la app).

**Causa raíz**: existen **dos sistemas distintos** de Supabase para WebAuthn:

1. **Factor MFA-WebAuthn** — `supabase.auth.mfa.enroll({ factorType: "webauthn" })`
   + `mfa.challenge` / `mfa.verify`. Gobernado por un flag de enroll de MFA que está
   **deshabilitado** en el proyecto.
2. **Passkeys (beta)** — sistema independiente, habilitado en el dashboard del
   proyecto (Authentication → Configuration → Passkeys, con RP ID y origins).

El código (`passkey-register.ts`, `passkey-sign-in-button.tsx`) usaba la ruta **(1)**
con `@simplewebauthn/browser` para la ceremonia, mientras que lo habilitado en el
dashboard era **(2)**. Por eso la config del dashboard se veía correcta pero el enroll
seguía rechazado. (Confusión adicional detectada durante el diagnóstico: el
**Relying Party ID** debe ser el dominio pelado — `localhost` en dev — no el display
name del proyecto.)

## 3. Decisión de diseño

Migrar el registro y el login de passkeys a la **API nativa de Passkeys (beta)** de
Supabase, que es la que ya está habilitada en el dashboard:

- Cliente de navegador con `auth.experimental.passkey = true`.
- Registro: `supabase.auth.registerPasskey()` (requiere sesión activa, que existe en
  el onboarding).
- Login: `supabase.auth.signInWithPasskey()` con **credenciales descubribles** (no
  requiere email ni listar factores previamente).

Estos métodos ejecutan internamente la ceremonia WebAuthn completa (challenge →
`navigator.credentials.create/get` → verify) contra el Relying Party configurado en
el dashboard, lo que permite **eliminar**:
- El server action `passkey-register.ts` (`mfa.enroll` + `mfa.challenge` + `mfa.verify`).
- El ciclo MFA manual de `passkey-sign-in-button.tsx` (`listFactors` + `challenge` +
  `verify`).
- La dependencia `@simplewebauthn/browser`.

Se **conserva** el server action `passkey-sign-in.ts` solo para telemetría de fallo
(`reportPasskeyFailure`).

## 4. Contratos modificados

| Elemento | Tipo | Cambio |
|----------|------|--------|
| `src/lib/supabase/client.ts` | mod | `createBrowserClient` con `auth.experimental.passkey: true` |
| `src/features/profile/components/passkey-step.tsx` | mod | Registro vía `supabase.auth.registerPasskey()` client-side |
| `src/features/auth/components/passkey-sign-in-button.tsx` | mod | Login vía `supabase.auth.signInWithPasskey()` |
| `src/features/auth/actions/passkey-register.ts` | **del** | Server action obsoleto (ruta MFA-WebAuthn) |
| `src/features/auth/actions/passkey-sign-in.ts` | mod | Comentario actualizado; conserva `reportPasskeyFailure` |
| `package.json` | mod | Eliminada dependencia `@simplewebauthn/browser` |
| **Dashboard Supabase (prod)** | ops | "Enable Passkey authentication" ON; RP ID = dominio real; origins correctos |
| `requirements.md` | doc | FR-REFINE-20.1 (Épica 19) |
| `stories.md` | doc | US-19.1 (Épica 19) |
| `carry-forward-decisions.md` | doc | CF-10 (adopción de la API de Passkeys beta) |

Sin cambios de schema, migraciones ni rutas.

## 5. NFR / Infra

- **NFR (compatibilidad)**: requiere `@supabase/supabase-js` **≥ 2.105.0** (el proyecto
  tiene 2.108.1). La API es **experimental** (`auth.experimental.passkey`); su
  superficie puede cambiar — la adopción y su revisión futura se registran como
  **CF-10**.
- **NFR (seguridad)**: los passkeys quedan ligados criptográficamente al **Relying
  Party ID**. En dev RP ID = `localhost` (origin `http://localhost:3000`); en prod el
  RP ID debe ser el **dominio real**. Un passkey registrado con un RP ID no sirve con
  otro (los de `localhost` no funcionan en prod y viceversa — esperado entre
  entornos). Security Baseline permanece habilitado.
- **Infra**: sin schema/migraciones/rutas. **Pendiente Operations**: confirmar en el
  dashboard de Supabase de prod que "Enable Passkey authentication" está ON con RP ID
  = dominio real y origins correctos.

## 6. Verificación esperada

- `tsc --noEmit` 0 errores; Biome limpio; ESLint 0; `next build` OK.
- No quedan referencias a `@simplewebauthn/browser` ni a
  `mfa.enroll({ factorType: "webauthn" })` para passkeys en `src/`.
- `pnpm install` poda la dependencia y deja `package.json`/lockfile consistentes.
- En vivo (Operations): registrar un passkey en el onboarding ya no da
  "MFA enroll is disabled for WebAuthn"; el login con passkey crea sesión.

## 7. Épica 19 — Historias de usuario

- **US-19.1**: Como usuario en el onboarding (o login), quiero registrar/usar un
  passkey sin recibir "MFA enroll is disabled for WebAuthn", para autenticarme con la
  biometría/PIN de mi dispositivo de forma fluida.

## 8. Estado de implementación

Código implementado y verificado en esta sesión: `tsc --noEmit` 0 errores, Biome
limpio sobre los archivos tocados, `next build` OK (24 rutas), `pnpm install` poda
`@simplewebauthn/browser`. Pendiente: prueba en vivo del registro/login con passkey
(Operations) y confirmación del RP ID/origins en el dashboard de prod.

**Nota (2026-06-17)**: Unit 38 (FR-REFINE-38, Épica 38) añade la gestión de passkeys
(listar/eliminar/registrar) desde `/settings/security`, cubriendo el gap con el diseño
original de Unit 1 (RULE-SEC-02, WF-13) que prescribía passkeys disponibles desde
Seguridad del Perfil. Unit 20 solo abordó el registro/login; la gestión queda como
nuevo refine documental pendiente de implementación.
