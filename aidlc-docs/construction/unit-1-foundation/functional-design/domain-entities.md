# Unit 1: Foundation — Domain Entities

## Entity Map

```
auth.users (Supabase-managed)
    |
    | 1:1
    v
Profile ──────────────── AvatarAsset (default set)
    |                         (referenced by avatar_url)
    | avatar_url, avatar_source
    v
Supabase Storage
  avatars/custom/{user_id}/...
  avatars/defaults/...
```

---

## Profile

The app-level extension of the Supabase `auth.users` record. Represents a user's public identity within the platform.

### Fields

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, FK → auth.users.id | Shared key with Supabase Auth |
| nickname_base | VARCHAR(20) | NOT NULL after onboarding | Base part of the display name (e.g., "Messi10") |
| nickname_discriminator | CHAR(4) | NOT NULL after onboarding | Zero-padded random 4-digit suffix (e.g., "4921") |
| avatar_url | TEXT | NOT NULL | URL of the currently active avatar image |
| avatar_source | ENUM | NOT NULL | Which source is currently active: GOOGLE_PHOTO, DEFAULT_SET, CUSTOM_UPLOAD |
| verification_status | ENUM | NOT NULL, default UNVERIFIED | User access tier: UNVERIFIED, VERIFIED, ADMIN |
| mfa_enabled | BOOLEAN | NOT NULL, default false | Whether TOTP MFA is currently enrolled |
| deleted_at | TIMESTAMPTZ | NULL | Soft-delete timestamp; NULL means active |
| created_at | TIMESTAMPTZ | NOT NULL | Row creation time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last modification time |

### Computed Properties

- **display_nickname**: `nickname_base + "#" + nickname_discriminator` (e.g., `Messi10#4921`)
- **is_profile_complete**: `nickname_base IS NOT NULL` — gates access to the full application
- **is_active**: `deleted_at IS NULL`

### Enumerations

**verification_status**
- `UNVERIFIED` — registered via email but email not yet confirmed
- `VERIFIED` — email confirmed, or registered via Google OAuth
- `ADMIN` — global administrator (set via seed script only in v1)

**avatar_source**
- `GOOGLE_PHOTO` — imported from the user's Google account
- `DEFAULT_SET` — selected from the platform's default avatar collection
- `CUSTOM_UPLOAD` — uploaded by the user to Supabase Storage

### Uniqueness Constraint

The compound `(nickname_base, nickname_discriminator)` must be unique across all non-deleted profiles.

### Notes

- `Profile.id` is intentionally the same value as `auth.users.id` (Supabase convention). No separate FK column is needed.
- `nickname_base` and `nickname_discriminator` are NULL until the user completes the onboarding wizard. While NULL, the hard gate applies.
- `mfa_enabled` mirrors whether Supabase Auth has an active TOTP factor for this user. It is kept in sync when the user enrolls or removes MFA.
- The profile is never hard-deleted. `deleted_at` is set on account deletion to preserve historical prediction and scoring records.

---

## AvatarAsset

Represents one entry in the platform's default avatar set. Stored in Supabase Storage and seeded via script.

### Fields

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(80) | NOT NULL | Human-readable display name (e.g., "Blue Fox") |
| storage_path | TEXT | NOT NULL | Path within Supabase Storage (e.g., `avatars/defaults/blue-fox.png`) |
| storage_url | TEXT | NOT NULL | Full public URL for display |
| display_order | INTEGER | NOT NULL, default 0 | Controls the order shown in the avatar picker grid |
| created_at | TIMESTAMPTZ | NOT NULL | Row creation time |

### Notes

- AvatarAsset rows are created by a seed script; they are read-only at runtime.
- `storage_url` is derived from the Supabase Storage public URL pattern at seed time and stored directly to avoid repeated URL construction.

---

## Supabase Auth Entities (External — Reference Only)

These entities are managed by Supabase Auth and are not owned by the application schema. They are listed here to clarify the relationships.

### auth.users

| Relevant Field | Description |
|---|---|
| id | UUID primary key — shared with Profile.id |
| email | Primary email address |
| email_confirmed_at | Timestamp of email verification; NULL means unverified |
| created_at | Account creation time |

### auth.identities

One row per linked authentication method for a user.

| Relevant Field | Description |
|---|---|
| id | Identity row UUID |
| user_id | FK → auth.users.id |
| provider | Authentication provider: `email`, `google` |
| identity_data | Provider-specific data (e.g., Google subject, avatar URL) |

A single `auth.users` row can have multiple `auth.identities` rows — one for email/password and one for Google OAuth when account linking occurs.

---

## Entity Relationship Summary

```
auth.users (1) ──── (1) Profile
                         |
                     avatar_url
                         |
                    +----+----+
                    |         |
              AvatarAsset   Supabase Storage
            (default set)  (custom upload)
```

- One `auth.users` → one `Profile` (created immediately on first authentication)
- One `auth.users` → many `auth.identities` (email identity and/or Google identity)
- `Profile.avatar_url` points to either a `AvatarAsset.storage_url`, a Supabase Storage custom upload URL, or a Google-provided photo URL
