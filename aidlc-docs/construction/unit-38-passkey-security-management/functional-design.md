# Unit 38 — Gestión de passkeys desde Perfil → Seguridad · Functional Design

> Refine post-construcción (2026-06-17). **No reinicia** Units 1–37; añade la
> gestión de passkeys (listar, eliminar, registrar) en `/settings/security`,
> cubriendo el gap con el diseño original de Unit 1 (RULE-SEC-02, WF-13). Usa
> exclusivamente la API nativa de Passkeys de Supabase por **CF-10**.
> Cubre FR-REFINE-38.1…38.4 y la **Épica 38**.

## 1. Alcance y trazabilidad

| Historia | FR-REFINE | Naturaleza | Resultado |
|----------|-----------|------------|-----------|
| US-38.1 | 38.1, 38.2, 38.3, 38.4 | UI/auth (passkey) | El usuario ve, elimina y registra passkeys desde `/settings/security` |

## 2. Problema observado

El diseño original de Unit 1 prescribía que los passkeys debían estar disponibles
desde `/settings/security` (RULE-SEC-02: *"Passkeys are always available from
`/settings/security`"*; WF-13: *"User chooses to set up a passkey during onboarding
optional step or from `/settings/security`"*). Unit 20 corrigió el bug de registro
y login migrando a la API nativa (`registerPasskey`/`signInWithPasskey`), pero
**no implementó** la interfaz de gestión desde Seguridad.

Actualmente `/settings/security` solo contiene:
- Tarjeta de TOTP MFA (listar factores, habilitar/deshabilitar).
- Tarjeta "Zona de peligro" (eliminar cuenta).

**No hay sección de passkeys**: el usuario no puede ver qué passkeys tiene
registrados, no puede eliminar uno que ya no use, y no puede registrar uno nuevo
sin volver al onboarding (que ya completó).

## 3. Decisión de diseño

Añadir una tarjeta "Passkeys" en `/settings/security`, **bajo** la tarjeta de
TOTP MFA y **sobre** el separador de la zona de peligro, usando exclusivamente la
API nativa de Passkeys (CF-10):

- **Listado**: `supabase.auth.passkey.list()` — devuelve las credenciales
  registradas (id, friendlyName, createdAt, etc.).
- **Eliminación**: `supabase.auth.passkey.delete(id)` con confirmación previa.
- **Registro**: reutiliza `supabase.auth.registerPasskey()` (mismo mecanismo que
  el onboarding, `passkey-step.tsx`).
- **Lectura server-side**: el listado se hace en el Server Component
  (`page.tsx`) para SSR sin flash, igual que los factores TOTP.
- **Mutaciones client-side**: eliminar y registrar son operaciones del navegador
  (requieren `navigator.credentials` y sesión activa) → componente cliente.

La sección de TOTP MFA y la zona de peligro no se modifican.

## 4. Contratos

### 4.1 Server Component (`page.tsx`)

Añadir una query paralela a `getProfile()` y `mfa.listFactors()`:

```ts
const { data: passkeysData } = await supabase.auth.passkey.list();
```

El server component pasa los passkeys serializados al cliente:

```ts
passkeys={passkeysData?.passkeys?.map((p) => ({
  id: p.id,
  friendlyName: p.friendly_name ?? dictionary.settings.passkeyDefaultName,
  createdAt: p.created_at,
})) ?? []}
```

### 4.2 Client Component (`security-client.tsx` o nuevo `passkey-management-card.tsx`)

| Prop | Tipo | Descripción |
|------|------|-------------|
| `passkeys` | `PasskeyInfo[]` | Lista de passkeys del servidor |
| Estado local | `useState(passkeys)` | Refleja altas/bajas sin refetch |

Operaciones:

| Acción | API | Confirmación | Feedback |
|--------|-----|-------------|----------|
| Registrar | `supabase.auth.registerPasskey()` | No (ceremonia WebAuthn nativa ya es explícita) | Toast éxito/error; añade a lista local |
| Eliminar | `supabase.auth.passkey.delete(id)` | Modal/Dialog de confirmación ("¿Eliminar este passkey?") | Toast éxito/error; quita de lista local |

**Nota sobre `auth.passkey` namespace**: es la API experimental de Supabase
(≥2.105.0, el proyecto está en 2.108.1). Si los métodos `passkey.list()` o
`passkey.delete()` no estuvieran expuestos en esta versión, la implementación
debe usar el fallback equivalente disponible (p.ej. leer `user.identities`
filtradas por `provider: "passkey"` en `getUser()`, o usar la Admin API para
delete). El contrato funcional no cambia; el Code Generation resuelve el método
concreto.

### 4.3 UI — Layout de la tarjeta

```
┌─────────────────────────────────────────┐
│ Passkeys                    [Registrar] │
│ Inicia sesión con biometría o PIN.      │
│                                         │
│ ┌─── iPhone Touch ID ────── [Eliminar]┐ │
│ └──────────────────────────────────────┘ │
│ ┌─── YubiKey 5C ──────────── [Eliminar]┐ │
│ └──────────────────────────────────────┘ │
│                                         │
│ (si vacío: "No tienes passkeys          │
│  registrados." + botón [Registrar])     │
└─────────────────────────────────────────┘
```

- `CardTitle`: "Passkeys"
- `CardDescription`: copy i18n explicando qué son
- `Badge`: cantidad de passkeys o estado "Sin passkeys"
- Cada passkey: fila `border rounded-md px-4 py-3` con `friendlyName` + botón
  `destructive size="sm"` "Eliminar" (mismo patrón que las filas TOTP).
- Botón `outline` "Registrar un passkey" (siempre visible, como "Agregar app de
  autenticación" en TOTP).
- Registro reutiliza el patrón de `passkey-step.tsx`: estado `pending` durante la
  ceremonia WebAuthn, `FormError` para errores, toast de éxito al terminar.

### 4.4 Integración con el page actual

`page.tsx` añade `passkey.list()` a su `Promise.all` existente y pasa
`passkeys` al cliente. `security-client.tsx` recibe la nueva prop `passkeys`
y renderiza la tarjeta de passkeys entre la tarjeta TOTP y el `<Separator />`.

**Sin cambios de layout, rutas ni navegación**: `/settings/security` sigue
siendo la misma ruta; el `UserMenu` ya enlaza a ella (US-10.3).

### 4.5 i18n — Nuevas claves en `settings`

| Clave | ES | EN |
|-------|----|----|
| `passkeyTitle` | Passkeys | Passkeys |
| `passkeyDescription` | Inicia sesión con tu huella, rostro o llave de seguridad. | Sign in with your fingerprint, face, or security key. |
| `passkeyDefaultName` | Passkey | Passkey |
| `passkeyRegister` | Registrar un passkey | Register a passkey |
| `passkeyRegistering` | Registrando passkey… | Registering passkey… |
| `passkeyRegistered` | Passkey registrado | Passkey registered |
| `passkeyDelete` | Eliminar | Delete |
| `passkeyDeleteTitle` | ¿Eliminar este passkey? | Delete this passkey? |
| `passkeyDeleteDescription` | Ya no podrás usarlo para iniciar sesión. | You will no longer be able to use it to sign in. |
| `passkeyDeleted` | Passkey eliminado | Passkey deleted |
| `passkeyEmpty` | No tienes passkeys registrados. | You have no registered passkeys. |
| `passkeyCount` | {count} passkey(s) | {count} passkey(s) |

## 5. NFR / Infra

- **NFR (seguridad)**: las operaciones de passkey usan la sesión activa del
  navegador; Supabase Auth gestiona la autorización de la ceremonia WebAuthn.
  Security Baseline intacto (SECURITY-12 ya cubre auth/passkey management).
- **NFR (compatibilidad)**: el namespace `auth.passkey.*` es experimental
  (`≥2.105.0`). Si la versión actual (2.108.1) no expone `list`/`delete`, el
  code generation debe buscar el método equivalente disponible y documentarlo
  como nota de implementación. El comportamiento funcional (ver lista, poder
  eliminar) no se degrada.
- **NFR (accesibilidad)**: la tarjeta sigue el mismo patrón de teclado/foco que
  la sección TOTP existente; botones con labels claros; diálogo de confirmación
  navegable por teclado.
- **Infra**: sin schema, migraciones ni rutas nuevas. Sin dependencias npm
  nuevas (`@supabase/supabase-js` ya incluye la API).

## 6. Verificación esperada

- `tsc --noEmit` 0 errores; Biome limpio; ESLint 0; `next build` OK.
- `pnpm test` suite completa verde (tests existentes + nuevos tests de
  passkey management card).
- En `/settings/security`: se ve la tarjeta de passkeys con la lista o el
  estado vacío.
- Registrar un passkey desde Seguridad funciona igual que en el onboarding.
- Eliminar un passkey pide confirmación y lo quita de la lista.
- La sección TOTP MFA y la zona de peligro no se modifican.
- Copy i18n completa en `es` y `en` para todas las claves nuevas.

## 7. Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/app/(app)/settings/security/page.tsx` | Añadir `await supabase.auth.passkey.list()` al `Promise.all`; pasar `passkeys` al cliente |
| `src/app/(app)/settings/security/security-client.tsx` | Recibir prop `passkeys`; renderizar tarjeta de passkeys entre TOTP y Separator |
| `src/features/auth/components/passkey-management-card.tsx` | **NUEVO** — componente cliente con lista/registro/eliminación de passkeys |
| `src/features/auth/components/__tests__/passkey-management-card.test.tsx` | **NUEVO** — tests del componente |
| `src/i18n/dictionaries/es.ts` | Añadir `settings.passkey*` (13 claves) |
| `src/i18n/dictionaries/en.ts` | Añadir `settings.passkey*` (13 claves) |

## 8. Dependencias

- **Unit 1 Foundation**: RULE-SEC-02, WF-13 (diseño original que prescribe
  passkeys en `/settings/security`).
- **Unit 20 Passkey Native API**: `registerPasskey()` ya implementado;
  `client.ts` ya tiene `auth.experimental.passkey = true`.
- **Unit 11 App Shell**: `UserMenu` ya enlaza a `/settings/security` (US-10.3).
- **CF-10**: usar `auth.passkey.*`, no `mfa.listFactors().webauthn`.
- **Unit 24 i18n**: diccionarios tipados `es`/`en`; nuevas claves en `settings`.
