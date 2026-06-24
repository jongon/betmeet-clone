# Functional Design — Unit 68: registro con correo preserva el pool de la invitación

> Refine post-construcción (2026-06-24) vía `/aidlc:refine`. **Fix de bug** sobre **Unit 13**
> (Pool Invitations — preservación de destino, FR-REFINE-13.1/13.2) y **Unit 16** (flujo
> `email_confirm`), alineado con el flujo `token_hash` activo de **Unit 9** (Email). **Plan
> presentado y aprobado antes de ejecutar** (alcance acotado vía AskUserQuestion). **No reinicia**
> etapas aprobadas (Units 1–67).

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-68.1 | requirements | Quien se registra con correo desde un enlace de invitación, tras confirmar su cuenta llega a `/pools/join/<token>` (no a `/matches`). |
| FR-REFINE-68.2 | requirements | El destino sobrevive a abrir el enlace de confirmación en otro dispositivo/navegador (consistente con el flujo `token_hash`). |
| FR-REFINE-13.1 | unit-13 | `proxy.ts` propaga el destino como `next`; `sign-in`/`sign-up` lo conservan en vez de ir fijo a `/matches`. |
| FR-REFINE-13.2 | unit-13 | El `next` se encadena a través de onboarding (`/onboarding/profile?next=…`). |
| BR-16.x | unit-16 | `sign-up.ts` marca el flujo con `flow=email_confirm` en `emailRedirectTo` (fallback PKCE en `/auth/callback`). |
| BR-9.x | unit-9 | Confirmación de cuentas vía `token_hash` + `verifyOtp` (`/auth/confirm`), plantillas versionadas en `supabase/templates/*.html`. |

## 1. Intención del usuario

> *"Cuando creo una cuenta con correo y llegué por el link de invitación de un pool, ¿la
> redirección me lleva al pool invitado?"* — y el reporte de campo: *"varias personas usaron el
> enlace de unirse al pool pero no se unieron, aunque sí crearon sus cuentas."*

**Diagnóstico (causa raíz), confirmado por inspección del código y de las plantillas:**

El proyecto confirma cuentas con el flujo **`token_hash`** (no PKCE) — ver `CHANGELOG` (Unit 9, CF-7)
y `supabase/config.toml` (`[auth.email.template.confirmation] content_path =
./supabase/templates/confirmation.html`). La plantilla `confirmation.html` enlazaba a:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/matches
```

El `next` estaba **hardcodeado a `/matches`**. El esfuerzo de `sign-up.ts` por preservar el destino
vía `emailRedirectTo=/auth/callback?flow=email_confirm&next=/pools/join/<token>` quedaba
**ignorado**: la plantilla `token_hash` no usa `{{ .ConfirmationURL }}`/`{{ .RedirectTo }}`, sino un
enlace estático. Resultado: la cuenta se creaba y confirmaba, pero el usuario caía en `/matches` y
**nunca llegaba a la página del pool**, así que no se unía.

**Diagnóstico por método de acceso (contexto):**
- **Google** y **login con correo** (cuenta ya confirmada): el `next` se propaga por `/auth/callback`
  y `sign-in.ts` → sí regresan a `/pools/join/<token>`. *(Ya funcionaban.)*
- **Registro con correo** (cuenta nueva): ❌ roto por la plantilla. *(Este es el fix.)*

**Decisiones (AskUserQuestion):**
- Alcance ⇒ **solo** arreglar la causa raíz del registro con correo. Llevar el destino real dentro
  del propio enlace de confirmación, para que **sobreviva cross-device** (que es justo el motivo de
  usar `token_hash`).
- **Fuera de alcance**: auto-unirse al pool. Al volver a `/pools/join/<token>` el usuario sigue
  pulsando **"Unirse"** (`JoinConfirm` → `joinPoolByToken`) para crear la membresía; este fix
  garantiza que **llegue** a esa página.

## 2. Business Rules

| ID | Regla | Trazabilidad |
|---|---|---|
| **BR-68.1** | El email de confirmación de cuenta lleva el destino real del usuario, no un valor fijo. Se transporta en `user_metadata.invite_next` (sembrado en `signUp`) y la plantilla lo renderiza con `{{ .Data.invite_next }}`. | FR-REFINE-68.1, FR-REFINE-68.2 |
| **BR-68.2** | `invite_next` se guarda **percent-encoded** (`encodeURIComponent(next)`), para que rutas con query string no rompan el query del propio enlace; `/auth/confirm` lo decodifica vía `searchParams.get("next")`. | FR-REFINE-68.1 |
| **BR-68.3** | `invite_next` se establece **siempre**, incluido el default `/matches`. Una clave ausente renderiza `<no value>` en la plantilla Go y rompería la URL. | FR-REFINE-68.1 |
| **BR-68.4** | El destino sigue saneado contra open-redirect: `next` pasa por `sanitizeNext` en `sign-up.ts` (al sembrar) y en `/auth/confirm` (al leer); valores no same-origin caen a `/matches`. | FR-REFINE-13.1 |
| **BR-68.5** | `emailRedirectTo` con `flow=email_confirm` se conserva como fallback para la plantilla PKCE (`/auth/callback`); no estorba al flujo `token_hash` activo. | BR-16.x |

## 3. Business Logic Model

### BL-68.1: sembrar el destino al registrarse (`sign-up.ts`)

```
next = sanitizeNext(formData.next)            # default "/matches"
supabase.auth.signUp({
  email, password,
  options: {
    emailRedirectTo,                          # fallback PKCE (sin efecto en token_hash)
    data: { invite_next: encodeURIComponent(next) },   # BR-68.1/68.2/68.3
  },
})
redirect("/verify-email")
```

### BL-68.2: la plantilla transporta el destino (`confirmation.html`)

```
.../auth/confirm?token_hash={{ .TokenHash }}&type=signup&next={{ .Data.invite_next }}
```
(en los dos enlaces: botón y respaldo en texto).

### BL-68.3: el confirm lee y rebota (`/auth/confirm` — sin cambios)

```
next = sanitizeNext(searchParams.get("next"))                 # decodifica %2F…
destination = onboardingCompleted ? next
                                  : `/onboarding/profile?next=${enc(next)}`   # FR-REFINE-13.2
redirect(destination)
```
Usuario nuevo ⇒ onboarding encadena `next` y `onboarding-client` hace `router.push(next)` al
terminar ⇒ aterriza en `/pools/join/<token>`.

## 4. Contratos / cambios

| Archivo | Cambio |
|---|---|
| `src/features/auth/actions/sign-up.ts` | `options.data = { invite_next: encodeURIComponent(next) }` (siempre); comentario de causa raíz; se conserva `emailRedirectTo`. |
| `supabase/templates/confirmation.html` | Las 2 ocurrencias de `&type=signup&next=/matches` → `&type=signup&next={{ .Data.invite_next }}`. |
| `src/features/auth/actions/__tests__/sign-up.test.ts` | +2 tests: `invite_next` codificado para una invitación y default `/matches`. |

### Sin cambios
- `src/app/auth/confirm/route.ts`: ya lee y sanea `next` y acepta `type=signup`.
- Schema / migraciones: ninguna.

### Despliegue (ops)
- La plantilla `confirmation.html` debe quedar **activa en Supabase** (mismo mecanismo que CF-7).
  El cambio de `sign-up.ts` no surte efecto hasta que la plantilla viva esté actualizada. **Hecho
  por el usuario** antes de este commit.

### Fuera de alcance
- **Auto-unión** al pool sin pulsar "Unirse" (decisión del usuario).

## 5. Security Baseline Compliance

| Regla | Estado | Razón |
|---|---|---|
| SECURITY-11 (open redirect) | **COMPLIANT** | `sanitizeNext` se aplica al sembrar (`sign-up.ts`) y al leer (`/auth/confirm`); solo rutas same-origin sobreviven, fallback `/matches`. |
| SECURITY-05 (input validation) | **COMPLIANT** | El destino se valida con `sanitizeNext`; el resto del input de `signUp` lo valida `SignUpSchema`. |
| Exposición de datos | **COMPLIANT** | `invite_next` es una ruta interna (p. ej. `/pools/join/<token>`) en `user_metadata`; no hay PII nueva ni superficie de entrada nueva. |

## 6. Verificación

- **Tests**: `npx vitest run src/features/auth/actions/__tests__/sign-up.test.ts` → 6/6 (incluye
  `invite_next` codificado y default).
- **Local (Supabase + Inbucket)**: abrir `/pools/join/<TOKEN>` sin sesión → registrarse con correo →
  el email enlaza a `…&next=%2Fpools%2Fjoin%2F<TOKEN>` (no `/matches`).
- **Seguir el enlace**: usuario nuevo → `/onboarding/profile?next=/pools/join/<TOKEN>` → al terminar
  onboarding aterriza en `/pools/join/<TOKEN>` → "Unirse" → `/pools/<poolId>`.
- **No regresión default**: registro **sin** invitación → email con `next=%2Fmatches` → cae en
  `/matches`.
