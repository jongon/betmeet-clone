# Unit 1: Foundation — Functional Design Plan

## Unit
**Foundation: Auth, Profile, Nickname, Avatar**

## Stories in Scope
- US-1.1: Registro y login tradicional
- US-1.2: Autenticación con Google (Auto-verificación)
- US-1.3: Inicio de sesión con Passkeys
- US-1.4: Account Linking (Fusión de cuentas)
- US-1.5: Configuración de Seguridad y MFA
- US-1.6: Gestión de Avatar
- US-1.7: Nickname Único (Estilo Discord)

## Plan Checklist
- [x] Collect and analyze answers to clarification questions below
- [x] Generate `aidlc-docs/construction/unit-1-foundation/functional-design/domain-entities.md`
- [x] Generate `aidlc-docs/construction/unit-1-foundation/functional-design/business-logic-model.md`
- [x] Generate `aidlc-docs/construction/unit-1-foundation/functional-design/business-rules.md`
- [x] Generate `aidlc-docs/construction/unit-1-foundation/functional-design/frontend-components.md`

---

## Clarification Questions

Please answer each question by filling in the letter after the `[Answer]:` tag.
If none of the options match, choose the last option (X) and describe your preference.

---

### Question 1
When a user registers with their email (traditional) and later tries to sign in with Google using the **same email address**, how should account linking work?

A) Auto-link silently — Supabase Auth detects the matching email and merges both identities automatically without any user-facing prompt
B) Prompt-to-link — Show the user a confirmation screen ("We found an account with this email. Link your Google account?") before merging
C) Fail with guidance — Reject the social login and tell the user to sign in with their original method, then link from settings
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 2
When the requested nickname base is already taken (e.g., "Messi10" exists), how should the numeric discriminator be assigned?

A) Random 4-digit number — assign a random number each time (e.g., "Messi10#4921"), retrying until unique
B) Sequential — assign the lowest available sequential number (e.g., "Messi10#0001", "Messi10#0002")
C) User-chosen — show the user which discriminators are still available and let them pick from a short list
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 3
After a new user authenticates for the first time but before they complete the profile setup (nickname + avatar), what level of access should they have?

A) Hard gate — immediately redirect to the profile setup wizard; no access to any app feature until nickname is confirmed
B) Soft gate — can browse read-only screens (fixture, public pools) but are prompted to complete profile before any write action (join pool, submit prediction)
C) No gate — profile setup is optional and never blocks functionality
X) Other (please describe after [Answer]: tag below)

[Answer]: Tiene que ser la opción A pero si deberían haber un generador de nickname randoms

---

### Question 4
When a user has multiple avatar sources available (Google photo already set, custom upload done), which one should be displayed?

A) Most recently set wins — whichever source the user changed last is active
B) Explicit selection — the user must always explicitly choose the active avatar from their available sources; no implicit priority
C) Priority order: custom upload > Google photo > default set (first source in priority wins unless user changes it)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 5
What file constraints should apply to custom avatar uploads?

A) JPEG/PNG only, max 2 MB, server-side resized and stored as 256×256 px
B) JPEG/PNG/WebP only, max 5 MB, stored at original resolution with a thumbnail generated for display
C) JPEG/PNG/WebP only, max 1 MB, stored at original size (no server-side resizing)
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 6
How does the very first admin user get created, and how can subsequent admins be promoted?

A) Seed-only — the initial admin is created via a seed script / environment variable; no in-app promotion in v1
B) Self-promotion on first run — if no admin exists, the first verified user who visits an `/admin/setup` route is promoted
C) Seed for first admin + in-app promotion — initial admin via seed; that admin can then promote other verified users from the admin panel
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 7
If a verified user changes their primary email address, what happens to their verification status?

A) Status stays Verified — the email change does not require re-verification (Supabase handles the confirmation flow separately)
B) Status resets to Unverified — the user must re-verify the new email before regaining full access
C) Supabase's default behavior takes precedence — we do not apply extra app-level logic on top
X) Other (please describe after [Answer]: tag below)

[Answer]: El cambio de email ocurre cuando el usuario haya verificado el nuevo email

---

### Question 8
Which account self-service flows must be supported in v1 for traditional (email/password) accounts?

A) Password reset via email link only
B) Password reset via email link + email change (with re-verification)
C) Password reset + email change + change password from settings (when already logged in) + account deletion
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Question 9
At what point in the user journey can a user register a passkey?

A) Only after the full profile setup is complete (nickname + avatar confirmed)
B) Any time after email verification — from the security/settings section
C) Offered as an optional step during onboarding, and also always available from settings later
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Question 10
How should the default avatar set be stored and served?

A) Static files committed to the repository, served via Next.js public folder
B) Uploaded to Supabase Storage; a seed file records their URLs — app fetches them from Supabase at runtime
C) External CDN — URLs are configured via environment variables, nothing stored in the repo or Supabase
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 11
Can a user change their nickname base (not just the discriminator) after initial setup, and if so, are there any restrictions?

A) Yes, freely — users can change their full nickname base at any time, and a new discriminator is assigned if needed
B) Yes, with cooldown — users can change it but must wait a fixed period (e.g., 30 days) between changes
C) No — the nickname base is permanent once set; only the discriminator can change if the base becomes unavailable (not applicable after set)
X) Other (please describe after [Answer]: tag below)

[Answer]: A
