# Unit 1: Foundation — Business Logic Model

## Workflows

---

### WF-01: Email/Password Registration

**Trigger**: Visitor submits sign-up form with email and password.

**Preconditions**: Email does not already exist in the system.

**Steps**:
1. Supabase Auth creates an `auth.users` record and an `email` identity in `auth.identities`.
2. Supabase Auth sends a verification email to the provided address.
3. The application creates a `Profile` row with:
   - `verification_status = UNVERIFIED`
   - `nickname_base = NULL` (onboarding not yet complete)
   - `avatar_url` = a randomly selected default avatar URL from `AvatarAsset`
   - `avatar_source = DEFAULT_SET`
4. The user is redirected to `/onboarding/profile` (hard gate activated by `nickname_base IS NULL`).

**Post-conditions**:
- An unverified profile exists. The user cannot access core features.
- Verification email is in transit.

**Alternate Path — Email already exists**:
- Supabase Auth returns an error. The sign-up form shows: "An account with this email already exists. Try signing in."

---

### WF-02: Google OAuth Registration (New Email)

**Trigger**: Visitor initiates Google sign-in and the email does not exist in `auth.users`.

**Steps**:
1. Supabase Auth completes the OAuth flow with Google and creates `auth.users` + a `google` identity.
2. Supabase marks the account as verified (`email_confirmed_at` is set) because Google provides a verified email.
3. The application creates a `Profile` row with:
   - `verification_status = VERIFIED`
   - `nickname_base = NULL`
   - `avatar_url` = the Google photo URL from the identity data
   - `avatar_source = GOOGLE_PHOTO`
4. The user is redirected to `/onboarding/profile`.

**Post-conditions**:
- A verified profile exists, pre-populated with the Google photo. Onboarding gate is still active.

---

### WF-03: Account Linking (Silent — Same Email)

**Trigger**: An authenticated user with an existing email/password account initiates Google sign-in with the same email address.

**Steps**:
1. Supabase Auth detects that the incoming Google OAuth email matches an existing `auth.users.email`.
2. Supabase Auth automatically adds a `google` identity row to `auth.identities` for the existing user. No second `auth.users` record is created.
3. The existing `Profile` is unchanged. All prior data (nickname, avatar, predictions, pool memberships) is preserved.
4. The user is signed in as the existing account.

**Post-conditions**:
- The user now has two linked identities (`email` + `google`) under one `auth.users` and one `Profile`.
- No user-visible prompt or confirmation step.

---

### WF-04: Onboarding Profile Wizard

**Trigger**: Authenticated user whose `Profile.nickname_base IS NULL` accesses any protected route.

**Preconditions**: User is authenticated. Profile row exists. `nickname_base` is NULL.

**Step 1 — Nickname Selection**:
1. Display 3 auto-generated random nickname suggestions (format: `AdjectiveNoun####`, e.g., "BlueEagle7432").
2. User may accept a suggestion or type a custom `nickname_base`.
3. Validate `nickname_base` format (see RULE-NICK-01).
4. Generate a random 4-digit `nickname_discriminator`.
5. Check uniqueness of `(nickname_base, nickname_discriminator)` in the `Profile` table.
   - On collision: generate a new random discriminator. Retry up to 10 times.
   - After 10 failures: return error "This nickname is very popular — please try a different name."
6. Show preview: `"Messi10#4921"`.
7. User confirms → proceed to Step 2.

**Step 2 — Avatar Selection**:
1. Display available sources:
   - If Google photo is available: show as the first selectable option, pre-selected.
   - Show paginated grid of `AvatarAsset` items from the default set.
   - Show "Upload your own" option.
2. For custom upload: validate file type (JPEG, PNG, WebP) and size (≤ 5 MB). On failure, show descriptive error.
   - Upload to Supabase Storage at path `avatars/custom/{user_id}/{timestamp}_{filename}`.
   - Generate and store a thumbnail at `avatars/custom/{user_id}/thumb_{timestamp}_{filename}`.
3. User selects or uploads an avatar.
4. User confirms → proceed to Step 3.

**Step 3 — Optional Passkey Setup**:
1. Show prompt: "Want to sign in faster with your device's biometrics?"
2. If user chooses "Set up passkey": trigger Supabase Auth WebAuthn registration flow.
3. If user chooses "Skip": no action taken. Passkey setup remains available from Settings.

**Completion**:
1. Write `nickname_base` and `nickname_discriminator` to the `Profile` row.
2. Write `avatar_url` and `avatar_source` to the `Profile` row.
3. Hard gate condition (`nickname_base IS NULL`) is now false.
4. Redirect user to the authenticated application home (`/matches`; ver CF-7).

---

### WF-05: Nickname Change

**Trigger**: Verified or Admin user submits a new nickname from `/settings/profile`.

**Steps**:
1. Validate `nickname_base` format (RULE-NICK-01).
2. Generate a new random 4-digit `nickname_discriminator`.
3. Check uniqueness of `(nickname_base, nickname_discriminator)` — retry up to 10 times on collision.
4. After 10 failures: return error "This nickname is very popular — please try a different name."
5. Update `Profile.nickname_base` and `Profile.nickname_discriminator`.

**Post-conditions**: `Profile.display_nickname` reflects the new value. Leaderboards and pool views display the updated name.

---

### WF-06: Avatar Change

**Trigger**: Verified or Admin user changes their avatar from `/settings/profile`.

**Sub-flow A — Select Google Photo**:
1. Fetch the current Google photo URL from `auth.identities.identity_data` (Google identity must be linked).
2. Update `Profile.avatar_url` = Google photo URL, `avatar_source = GOOGLE_PHOTO`.

**Sub-flow B — Select Default Set Avatar**:
1. User selects an `AvatarAsset` item from the grid.
2. Update `Profile.avatar_url` = `AvatarAsset.storage_url`, `avatar_source = DEFAULT_SET`.

**Sub-flow C — Upload Custom Avatar**:
1. Validate file type (JPEG, PNG, WebP) and size (≤ 5 MB). Reject with error if invalid.
2. Upload original to Supabase Storage: `avatars/custom/{user_id}/{timestamp}_{filename}`.
3. Generate thumbnail: `avatars/custom/{user_id}/thumb_{timestamp}_{filename}`.
4. Update `Profile.avatar_url` = original URL, `avatar_source = CUSTOM_UPLOAD`.

**Post-conditions**: The most recently set source is now the active avatar. `Profile.updated_at` is refreshed.

---

### WF-07: Email Verification

**Trigger**: User clicks the verification link in the registration email.

**Steps**:
1. Supabase Auth sets `auth.users.email_confirmed_at = now()`.
2. The application updates `Profile.verification_status = VERIFIED`.

**Post-conditions**: User now has full access to core features (pools, predictions).

---

### WF-08: Password Reset

**Trigger**: Unauthenticated user submits their email on the forgot-password form.

**Steps**:
1. Call Supabase Auth `resetPasswordForEmail(email)`.
2. Supabase sends a password reset link to the email.
3. User clicks link → lands on `/auth/reset-password` with a session token in the URL.
4. User enters and confirms new password.
5. Supabase Auth updates the password. The reset session is invalidated.

**Notes**: No `Profile` changes required. The form shows success even if the email is not registered (prevents email enumeration).

---

### WF-09: Email Change

**Trigger**: Authenticated user submits a new email address from `/settings/security`.

**Steps**:
1. Call Supabase Auth `updateUser({email: newEmail})`.
2. Supabase sends a confirmation link to the new email address.
3. While confirmation is pending, `Profile` and all app behavior remain on the old email.
4. User clicks the confirmation link in the new email.
5. Supabase Auth updates `auth.users.email` to the new address.
6. `Profile.verification_status` remains `VERIFIED` throughout — no regression occurs.

**Post-conditions**: The user's auth email is changed. `Profile.verification_status` is unchanged.

---

### WF-10: Change Password from Settings

**Trigger**: Authenticated user submits current password + new password from `/settings/security`.

**Steps**:
1. Validate that new password meets minimum requirements (≥ 8 characters).
2. Call Supabase Auth `updateUser({password: newPassword})`.
   - Supabase may require a recent session (reauthentication) for this operation.
3. On success: show confirmation message. No `Profile` changes.

---

### WF-11: Account Deletion

**Trigger**: Authenticated user confirms deletion from `/settings/security`.

**Preconditions**: User is authenticated. User has explicitly confirmed the action (confirmation modal with "I understand this cannot be undone" acknowledgement).

**Steps**:
1. Set `Profile.deleted_at = now()` (soft delete).
2. Call Supabase Admin API to delete `auth.users` record (hard delete from auth).
3. Invalidate all active sessions for this user.
4. Redirect to the public home page with a "Your account has been deleted" message.

**Post-conditions**:
- The user cannot sign in again.
- `Profile` row is retained (soft-deleted) to preserve historical prediction and scoring data.
- `Profile.nickname_base` and `Profile.nickname_discriminator` remain reserved — they are not released back to the unique compound pool until the record is purged (v1 does not purge).

---

### WF-12: MFA (TOTP) Enrollment

**Trigger**: Authenticated user initiates MFA setup from `/settings/security`.

**Steps**:
1. Call Supabase Auth MFA enrollment API to begin TOTP setup.
2. Display QR code for the user to scan with their authenticator app.
3. User enters the 6-digit TOTP code to verify enrollment.
4. Supabase Auth records the MFA factor.
5. Set `Profile.mfa_enabled = true`.

**Login flow when MFA is active**:
1. User enters email + password → Supabase Auth authenticates password.
2. Supabase Auth prompts for TOTP code (second factor).
3. User enters 6-digit code.
4. On valid code: session established normally.
5. On invalid code: session not established; show error.

---

### WF-13: Passkey Registration (WebAuthn)

**Trigger**: User chooses to set up a passkey (during onboarding optional step or from `/settings/security`).

**Steps**:
1. Call Supabase Auth passkey enrollment API.
2. Browser triggers the WebAuthn credential creation ceremony (uses device biometrics or security key).
3. On success: Supabase Auth stores the credential.
4. User can register multiple passkeys (e.g., phone and laptop).

**Sign-in with passkey**:
1. User clicks "Sign in with Passkey" on the sign-in page.
2. Browser triggers WebAuthn assertion ceremony.
3. On success: Supabase Auth establishes session.

---

### WF-14: Admin Bootstrap (Seed Only)

**Trigger**: Deployment or local setup script runs with an admin email configured via environment variable.

**Steps**:
1. Seed script looks up the `Profile` row by the configured admin email (via `auth.users.email` join).
2. Sets `Profile.verification_status = ADMIN`.

**Constraints**:
- No in-app UI for admin promotion in v1.
- Must be run after the admin user has completed registration (profile must exist).

---

## Nickname Auto-Generation Algorithm

The wizard generates 3 random suggestions using the following pattern:

```
{Adjective}{Noun}{4-digit-number}
```

Examples: `BlueEagle7432`, `SwiftLion0291`, `RedHawk5510`

- Adjective list: a fixed set of ~50 positive or sports-themed adjectives (e.g., Blue, Swift, Red, Bold, Iron, Wild).
- Noun list: a fixed set of ~50 animals or sports-related nouns (e.g., Eagle, Lion, Hawk, Falcon, Tiger, Wolf).
- 4-digit number: randomly generated (0000–9999, padded with leading zeros if needed).
- Three distinct combinations are generated and displayed simultaneously.

The generated suggestion is also subject to the standard discriminator uniqueness check before it is shown (see WF-04 Step 1).
