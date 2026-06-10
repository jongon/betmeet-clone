# Unit 1: Foundation — Business Rules

## Authentication Rules

**RULE-AUTH-01**
Email/password accounts start as `UNVERIFIED`. The status transitions to `VERIFIED` only after the user clicks the email verification link sent by Supabase Auth.

**RULE-AUTH-02**
Google OAuth accounts are set to `VERIFIED` immediately on first authentication. Google guarantees the email belongs to the user, so no additional verification step is needed.

**RULE-AUTH-03**
Only users with `verification_status = VERIFIED` or `ADMIN` may perform write actions: join a pool, create a pool, submit a prediction. UNVERIFIED users who have completed the onboarding wizard may read public content but not write.

**RULE-AUTH-04**
Password minimum length is 8 characters. This constraint is enforced by Supabase Auth and mirrored in the sign-up and change-password forms.

---

## Account Linking Rules

**RULE-LINK-01**
If a user initiates Google OAuth and the Google account's email matches an existing `auth.users.email`, Supabase Auth silently adds a `google` identity to `auth.identities` for the existing user. No second `auth.users` or `Profile` record is created.

**RULE-LINK-02**
A single `auth.users` record may have multiple linked identities (e.g., `email` + `google`). All identities resolve to the same `Profile`.

**RULE-LINK-03**
Profile data (nickname, avatar, pool memberships, predictions, scoring history) is owned by the single `Profile` row regardless of how many auth identities are linked. No data loss occurs during linking.

---

## Profile Onboarding Gate Rules

**RULE-GATE-01**
Any authenticated user whose `Profile.nickname_base IS NULL` is hard-gated: every protected route immediately redirects to `/onboarding/profile`. The only exempt routes are public routes and the onboarding wizard itself.

**RULE-GATE-02**
The gate condition is evaluated server-side on every protected route request. It cannot be bypassed by client-side navigation.

**RULE-GATE-03**
The gate is cleared when `Profile.nickname_base` is written during the onboarding wizard (WF-04 completion). The user is then redirected to the application home without repeating the wizard.

**RULE-GATE-04**
The passkey setup prompt (Step 3 of the onboarding wizard) is shown only after `nickname_base` and `avatar_url` are confirmed. It may be skipped without consequences.

---

## Nickname Rules

**RULE-NICK-01**
`nickname_base` must satisfy all of the following:
- Length: 3 to 20 characters (inclusive).
- Allowed characters: letters (a–z, A–Z), digits (0–9), underscores (`_`), hyphens (`-`).
- No spaces, no other special characters.

**RULE-NICK-02**
`nickname_discriminator` is always a randomly assigned 4-character string consisting only of digits, zero-padded (e.g., `0042`, `9999`). The range is `0000` to `9999`.

**RULE-NICK-03**
The compound `(nickname_base, nickname_discriminator)` must be globally unique across all non-deleted profiles. This constraint is enforced at the database level (unique index).

**RULE-NICK-04**
When a discriminator is randomly generated for a given base, the system checks uniqueness. On collision, a new random discriminator is generated and checked again. This retries up to 10 times.

**RULE-NICK-05**
If 10 consecutive discriminator retry attempts all collide, the system rejects the base with the error: "This nickname is very popular — please try a different name." The user must choose a different `nickname_base`.

**RULE-NICK-06**
Users may change their `nickname_base` at any time from profile settings. A new random discriminator is assigned on each change. No cooldown period applies.

**RULE-NICK-07**
The onboarding wizard presents at least 3 auto-generated nickname suggestions using the pattern `{Adjective}{Noun}{4-digit-number}`. Each suggestion is validated against RULE-NICK-03 before display. The user may accept a suggestion or type a custom base.

---

## Avatar Rules

**RULE-AVTR-01**
Every active `Profile` must have a non-null `avatar_url`. On profile creation, if no Google photo is available, a default-set avatar is assigned automatically.

**RULE-AVTR-02**
The active avatar is always the most recently set source. Setting any avatar source (Google photo, default set selection, or custom upload) overwrites `avatar_url` and `avatar_source`. There is no implicit priority — last action wins.

**RULE-AVTR-03**
Custom avatar uploads must satisfy all of the following:
- File format: JPEG (`.jpg` / `.jpeg`), PNG (`.png`), or WebP (`.webp`) only.
- Maximum file size: 5 MB.
- Non-compliant files are rejected before upload with a descriptive validation error.

**RULE-AVTR-04**
Accepted custom uploads are stored in Supabase Storage at path:
`avatars/custom/{user_id}/{unix_timestamp}_{original_filename}`.
A display thumbnail is generated and stored at:
`avatars/custom/{user_id}/thumb_{unix_timestamp}_{original_filename}`.
`Profile.avatar_url` is set to the original image URL; thumbnails are used for compact display contexts (leaderboards, pool member lists).

**RULE-AVTR-05**
The default avatar set is stored in Supabase Storage under `avatars/defaults/`. The `AvatarAsset` table holds URLs and display metadata. The available set is loaded at application startup (server-side) and cached.

---

## Email Change Rules

**RULE-EMAIL-01**
Email change follows a two-step process:
1. The user requests the change — Supabase Auth sends a confirmation link to the new email.
2. The change takes effect only after the user clicks the confirmation link.

**RULE-EMAIL-02**
During the period between requesting and confirming the email change, the user continues to authenticate with their old email. `Profile.verification_status` remains `VERIFIED` throughout. No access regression occurs.

---

## Security and Account Self-Service Rules

**RULE-SEC-01**
MFA (TOTP via authenticator app) is optional for all users including admins. When enrolled, a valid 6-digit TOTP code is required after password authentication at every login.

**RULE-SEC-02**
Passkeys (WebAuthn) are optional. A user may register multiple passkeys (e.g., different devices). Passkeys are offered as an optional step at the end of the onboarding wizard and are always available from `/settings/security`.

**RULE-SEC-03**
Account deletion requires explicit two-step confirmation in the UI. On confirmation:
- `Profile.deleted_at` is set (soft delete — data retained for audit purposes).
- `auth.users` is hard-deleted via the Supabase Admin API.
- All active sessions for the user are invalidated.

**RULE-SEC-04**
Deleted profiles are excluded from all application queries by filtering `Profile.deleted_at IS NULL`. The soft-deleted row remains in the database to preserve foreign key integrity for prediction and scoring records.

**RULE-SEC-05**
`ADMIN` status is assigned exclusively by a seed script using a configured environment variable. No in-app UI exists for admin promotion in v1.

**RULE-SEC-06**
The password reset form returns a success response regardless of whether the submitted email exists in the system. This prevents email enumeration attacks.

---

## Security Baseline Compliance Summary (Unit 1)

| Rule | Status | Notes |
|---|---|---|
| SECURITY-01 | Compliant | All Supabase/Vercel communication uses TLS. Storage access uses Supabase signed or public URLs over HTTPS. |
| SECURITY-02 | N/A | Logging design is in NFR Requirements / NFR Design stages. |
| SECURITY-03 | N/A | Structured logging design is in NFR Design. |
| SECURITY-04 | N/A | Security headers are configured at the infrastructure level. |
| SECURITY-05 | Compliant | All auth forms and server actions validate input with a schema (nickname format, file type/size, email format, password length). |
| SECURITY-06 | Compliant | Supabase service keys are never exposed to the client. RLS policies on the Profile table are defined in Infrastructure Design. |
| SECURITY-07 | N/A | Network restrictions are an infrastructure concern. |
| SECURITY-08 | Compliant | Profile writes (nickname, avatar) are scoped to the authenticated user's own row. Admin status is checked server-side. |
| SECURITY-09 | Compliant | Auth error messages are generic (e.g., "Invalid credentials") to avoid leaking existence information. Reset form hides whether email exists. |
| SECURITY-10 | N/A | Dependency scanning is a build-pipeline concern. |
| SECURITY-11 | Compliant | Account linking, deletion, and file upload are designed against misuse: silent linking prevents duplicate account creation; upload validation prevents malicious files. |
| SECURITY-12 | Compliant | Supabase Auth handles session tokens, credentials storage, and MFA/passkey enrollment. No custom credential storage. |
| SECURITY-13 | N/A | Immutable prediction/scoring data is a concern for Units 5 and 6. |
| SECURITY-14 | N/A | Security event retention is in NFR Design. |
| SECURITY-15 | Compliant | Auth and profile operations fail closed: any unexpected error returns a safe generic message and the operation is not partially applied. |
