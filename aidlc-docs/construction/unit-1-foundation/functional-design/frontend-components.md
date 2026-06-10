# Unit 1: Foundation — Frontend Components

## Component Hierarchy Overview

```
Auth Pages
├── SignInPage (/auth/sign-in)
│   ├── SignInForm
│   │   ├── EmailInput
│   │   ├── PasswordInput
│   │   └── SignInButton
│   ├── GoogleSignInButton
│   ├── PasskeySignInButton
│   ├── MFAPromptModal
│   │   ├── TOTPCodeInput
│   │   └── SubmitMFAButton
│   └── AuthPageLinks (sign-up / forgot-password)
├── SignUpPage (/auth/sign-up)
│   ├── SignUpForm
│   │   ├── EmailInput
│   │   ├── PasswordInput
│   │   ├── ConfirmPasswordInput
│   │   └── SignUpButton
│   ├── GoogleSignInButton
│   ├── PostSignUpBanner
│   └── AuthPageLinks (sign-in)
├── ForgotPasswordPage (/auth/forgot-password)
│   ├── ForgotPasswordForm
│   │   ├── EmailInput
│   │   └── SendResetButton
│   └── SuccessBanner
├── ResetPasswordPage (/auth/reset-password)
│   └── ResetPasswordForm
│       ├── NewPasswordInput
│       ├── ConfirmPasswordInput
│       └── ResetButton
└── VerifyEmailPage (/auth/verify-email)
    ├── VerifyEmailBanner
    └── ResendVerificationButton

Onboarding Wizard
└── OnboardingProfilePage (/onboarding/profile)
    ├── OnboardingProgressIndicator
    ├── NicknameStep (step 1)
    │   ├── NicknameSuggestions (3 cards)
    │   ├── NicknameInput
    │   ├── NicknamePreview
    │   └── NicknameStepNextButton
    ├── AvatarStep (step 2)
    │   ├── AvatarSourceTabs
    │   │   ├── GooglePhotoOption (conditional)
    │   │   ├── DefaultAvatarGrid
    │   │   └── UploadAvatarZone
    │   ├── AvatarPreview
    │   └── AvatarStepNextButton
    └── PasskeyStep (step 3 — optional)
        ├── PasskeyPromptCard
        ├── SetupPasskeyButton
        └── SkipPasskeyButton

Settings Pages
├── ProfileSettingsPage (/settings/profile)
│   ├── NicknameSection
│   │   ├── CurrentNicknameDisplay
│   │   ├── NicknameInput
│   │   └── SaveNicknameButton
│   └── AvatarSection
│       ├── CurrentAvatarDisplay
│       ├── AvatarSourceTabs (same as onboarding)
│       └── SaveAvatarButton
└── SecuritySettingsPage (/settings/security)
    ├── MFASection
    │   ├── MFAStatusBadge
    │   ├── EnableMFAButton → MFAEnrollmentModal
    │   │   ├── QRCodeDisplay
    │   │   ├── TOTPCodeInput
    │   │   └── ConfirmEnrollmentButton
    │   └── DisableMFAButton
    ├── PasskeySection
    │   ├── PasskeyList
    │   │   └── PasskeyListItem (device name + date + remove button)
    │   └── AddPasskeyButton
    ├── ChangePasswordSection (email accounts only)
    │   ├── CurrentPasswordInput
    │   ├── NewPasswordInput
    │   ├── ConfirmPasswordInput
    │   └── ChangePasswordButton
    ├── EmailChangeSection (email accounts only)
    │   ├── NewEmailInput
    │   ├── SubmitEmailChangeButton
    │   └── PendingEmailChangeBanner
    └── DangerZone
        └── DeleteAccountButton → ConfirmDeleteModal
            ├── DeletionWarningText
            ├── AcknowledgeCheckbox
            └── ConfirmDeleteButton
```

---

## Component Specifications

### SignInForm

**Purpose**: Authenticate a user with email and password.

**Props**: none (standalone page component)

**State**:
- `email: string` — controlled input
- `password: string` — controlled input
- `error: string | null` — error message from auth attempt
- `isLoading: boolean`

**User Interactions**:
1. User fills email and password fields, clicks "Sign In".
2. On success: redirect to `/home` (or to `/onboarding/profile` if gate condition applies).
3. On failure: display `error` below the submit button.
4. If MFA is active, `MFAPromptModal` opens after successful password auth.

**Validation (client-side)**:
- Email: valid email format (HTML5 type="email" + pattern check).
- Password: not empty.

**API Integration**:
- Calls `signInWithPassword(email, password)` via Supabase Auth client.
- On MFA required: calls Supabase Auth MFA challenge/verify flow.

---

### GoogleSignInButton

**Purpose**: Trigger Google OAuth sign-in or sign-up.

**Props**: none

**State**:
- `isLoading: boolean`

**User Interactions**:
1. User clicks button → browser is redirected to Google consent screen.
2. After consent: Supabase Auth callback handles token exchange and profile creation/linking.
3. App redirects to `/home` or `/onboarding/profile`.

**API Integration**:
- Calls `signInWithOAuth({ provider: 'google' })` via Supabase Auth client.

---

### PasskeySignInButton

**Purpose**: Sign in using a registered WebAuthn passkey.

**Props**: none

**Visibility**: Only rendered if the user's browser reports passkey support AND the user has previously registered a passkey (detected via Supabase Auth).

**User Interactions**:
1. User clicks button → browser WebAuthn assertion ceremony starts.
2. User authenticates with biometrics or security key.
3. On success: Supabase Auth establishes session → redirect to `/home`.

**API Integration**:
- Calls Supabase Auth passkey sign-in API.

---

### MFAPromptModal

**Purpose**: Collect TOTP code after password authentication succeeds when MFA is active.

**Props**:
- `onSuccess: () => void`
- `onCancel: () => void`

**State**:
- `code: string` — 6-digit TOTP input
- `error: string | null`
- `isLoading: boolean`

**User Interactions**:
1. User enters 6-digit code from their authenticator app.
2. On valid code: session established, `onSuccess` called.
3. On invalid code: display error, input cleared.

**Validation**:
- Code: exactly 6 digits.

**API Integration**:
- Calls Supabase Auth MFA challenge and verify API.

---

### NicknameStep

**Purpose**: First step of the onboarding wizard — set the user's nickname.

**Props**: `onComplete: (nicknamBase: string, discriminator: string) => void`

**State**:
- `suggestions: Array<{base: string, discriminator: string}>` — 3 pre-generated options
- `selectedSuggestion: number | null`
- `customBase: string` — if user types their own
- `error: string | null`
- `isLoading: boolean`

**User Interactions**:
1. Three suggestion cards are displayed on load. User may click one to select it.
2. User may instead type a custom nickname base in the input field (clears suggestion selection).
3. On input change: preview updates to show `base#XXXX` format.
4. On "Next": validate format → call server action to check uniqueness and persist → call `onComplete`.

**Validation (client-side)**:
- Length: 3–20 characters.
- Allowed characters: letters, digits, underscores, hyphens.

**API Integration**:
- On step completion: calls `setNickname(base)` Server Action, which generates the discriminator, checks uniqueness (up to 10 retries), and updates the Profile row.
- Returns `{discriminator: string}` on success or `{error: string}` on failure.

---

### AvatarStep

**Purpose**: Second step of the onboarding wizard — set the user's avatar.

**Props**: `onComplete: () => void`, `hasGooglePhoto: boolean`

**State**:
- `activeTab: 'google' | 'default' | 'upload'`
- `selectedDefaultId: string | null`
- `uploadFile: File | null`
- `uploadPreviewUrl: string | null`
- `uploadProgress: number`
- `error: string | null`

**User Interactions**:
1. If Google photo is available: first tab is pre-selected showing the Google photo.
2. Default tab: paginated grid of `AvatarAsset` items. Click to select.
3. Upload tab: drag-and-drop zone or file picker. On file selection, show preview.
4. On "Next": persist the selected avatar → call `onComplete`.

**Validation (client-side)**:
- File type: JPEG, PNG, or WebP (check `file.type`).
- File size: ≤ 5 MB (check `file.size`).
- Show inline error if validation fails; do not attempt upload.

**API Integration**:
- For default set selection: calls `setAvatarFromDefaultSet(assetId)` Server Action.
- For Google photo: calls `setAvatarFromGoogle()` Server Action (re-fetches URL from identity data).
- For upload: uploads to Supabase Storage client-side (direct upload with signed URL from server), then calls `setAvatarFromUpload(storagePath)` Server Action.

---

### PasskeyStep

**Purpose**: Optional third step of the onboarding wizard — register a passkey.

**Props**: `onComplete: () => void` (called for both "Set up" and "Skip")

**State**:
- `isLoading: boolean`
- `error: string | null`

**User Interactions**:
1. "Set up passkey" button: triggers WebAuthn ceremony → on success, show confirmation → call `onComplete`.
2. "Skip" button: calls `onComplete` immediately with no passkey registered.

**API Integration**:
- Calls Supabase Auth passkey enrollment API on setup.

---

### AvatarSourceTabs

**Purpose**: Reusable component for avatar source selection, used in both onboarding and profile settings.

**Props**:
- `hasGooglePhoto: boolean`
- `onSelectGoogle: () => void`
- `onSelectDefault: (assetId: string) => void`
- `onSelectUpload: (file: File) => Promise<void>`
- `currentSource: 'GOOGLE_PHOTO' | 'DEFAULT_SET' | 'CUSTOM_UPLOAD'`
- `currentAvatarUrl: string`

**Tabs**:
- "Google Photo" (only if `hasGooglePhoto = true`)
- "Default Set" — paginated grid
- "Upload" — file picker / drag-drop zone

---

### MFAEnrollmentModal

**Purpose**: Guide the user through TOTP MFA enrollment.

**Props**:
- `onSuccess: () => void`
- `onClose: () => void`

**State**:
- `qrCodeUrl: string | null`
- `totpSecret: string | null` — shown as manual entry fallback
- `verifyCode: string`
- `error: string | null`
- `isLoading: boolean`

**User Interactions**:
1. Modal opens → server generates TOTP enrollment data → QR code displayed.
2. User scans QR code with authenticator app.
3. User enters 6-digit code to verify enrollment.
4. On success: `Profile.mfa_enabled = true`, `onSuccess` called.

**API Integration**:
- Calls `startMFAEnrollment()` Server Action (Supabase Auth MFA enroll step 1).
- Calls `verifyMFAEnrollment(code)` Server Action (Supabase Auth MFA enroll step 2).

---

### ConfirmDeleteModal

**Purpose**: Two-step deletion confirmation to prevent accidental account deletion.

**Props**:
- `onConfirm: () => void`
- `onCancel: () => void`

**State**:
- `acknowledged: boolean` — checkbox state
- `isLoading: boolean`

**User Interactions**:
1. Modal opens with deletion consequences explained.
2. User checks "I understand this cannot be undone" checkbox to enable the confirm button.
3. User clicks "Delete my account" → calls `onConfirm`.

**API Integration**:
- Calls `deleteAccount()` Server Action, which sets `Profile.deleted_at` and calls Supabase Admin API.

---

## Form Validation Rules Summary

| Form | Field | Rules |
|---|---|---|
| SignUpForm | email | Valid email format, not empty |
| SignUpForm | password | Min 8 characters |
| SignUpForm | confirmPassword | Must match password |
| ResetPasswordForm | newPassword | Min 8 characters |
| ResetPasswordForm | confirmPassword | Must match newPassword |
| NicknameInput | nickname_base | 3–20 chars, letters/digits/underscore/hyphen only |
| UploadAvatarZone | file | JPEG/PNG/WebP only, max 5 MB |
| TOTPCodeInput | code | Exactly 6 digits |
| ChangePasswordForm | newPassword | Min 8 characters |
| ChangePasswordForm | confirmPassword | Must match newPassword |
| EmailChangeForm | newEmail | Valid email format, not empty |

---

## API Integration Points Summary

| Component / Action | Server Action / Supabase Call |
|---|---|
| Sign in with email | `supabase.auth.signInWithPassword()` |
| Sign in with Google | `supabase.auth.signInWithOAuth({ provider: 'google' })` |
| Sign in with passkey | Supabase Auth passkey sign-in API |
| MFA TOTP verify | Supabase Auth MFA challenge + verify |
| Sign up with email | `supabase.auth.signUp()` |
| Forgot password | `supabase.auth.resetPasswordForEmail()` |
| Reset password | `supabase.auth.updateUser({ password })` |
| Set nickname | `setNickname(base)` Server Action → Profile update |
| Set avatar (default) | `setAvatarFromDefaultSet(assetId)` Server Action |
| Set avatar (Google) | `setAvatarFromGoogle()` Server Action |
| Upload avatar | Direct Supabase Storage upload + `setAvatarFromUpload(path)` Server Action |
| Load default avatar set | `getDefaultAvatars()` Server Action → `AvatarAsset` query |
| Enable MFA | `startMFAEnrollment()` + `verifyMFAEnrollment(code)` Server Actions |
| Disable MFA | `disableMFA()` Server Action |
| Register passkey | Supabase Auth passkey enrollment API |
| Change password | `supabase.auth.updateUser({ password })` (server action) |
| Change email | `supabase.auth.updateUser({ email })` (server action) |
| Delete account | `deleteAccount()` Server Action → soft delete + Supabase Admin API |
