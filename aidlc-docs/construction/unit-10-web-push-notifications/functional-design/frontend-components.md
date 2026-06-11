# Unit 10: Web Push Notifications — Frontend Components

## NotificationSettingsPanel

- Location: profile/settings area from Unit 1.
- Shows browser support, permission status, active devices and event toggles.
- Primary actions: enable push, disable this device, disable all devices, save preferences.

## NotificationPreferenceSwitches

- Five toggles:
  - Match starts.
  - Match finishes.
  - Pool invitation.
  - Global rank improves.
  - Goal scored.
- Uses accessible labels and descriptions; no nested unclear copy.

## PushPermissionState

- Explains unsupported browsers, denied permissions and next steps.
- Avoids repeated browser prompts after denial.

## Service Worker

- Receives `push` events.
- Displays notifications with title/body/icon/url.
- Handles notification click by opening/focusing the safe URL.
- Does not contain secrets or business authorization logic.

## Toast/Inline Feedback

- Confirms subscription saved, preferences updated and device disabled.
- Surfaces non-sensitive errors, e.g. unsupported browser or permission denied.

## DirectedPoolInviteForm

- Extends the pool invite UI without removing the existing copyable link/code.
- Allows owner/admin to invite by nickname/discriminator or email.
- Shows whether the invite can trigger web push now (resolved existing user) or only creates a pending invite/link (email without account).
- Never reveals whether an email belongs to a private account beyond safe, generic confirmation copy.
