# Unit 43: Code Generation Plan — Part 1

## Status

- **Stage**: Code Generation — COMPLETE (both parts)
- **Unit**: Unit 43 (Web Push — Onboarding step + dispatch en sync admin)
- **Created**: 2026-06-18T00:00:00Z
- **Approval Gate**: Approved by user ("Execute the CONSTRUCTION PHASE") → Part 2 executed
- **Completed**: 2026-06-18T01:20:00Z

## Prerequisites

- ✅ Functional Design complete (`construction/unit-43-web-push-onboarding-dispatch/functional-design.md`)
- ✅ Requirements (FR-REFINE-43.1, FR-REFINE-43.2) in `requirements.md`
- ✅ User Stories (US-43.1, US-43.2) in `stories.md`
- ✅ NFR/Infra SKIP formal (embedded in Functional Design)
- ✅ No schema, migrations, routes, VAPID keys, or new dependencies

## Implementation Steps

### Step 1: i18n — Spanish (`src/i18n/dictionaries/es.ts`) [x]

Add 7 keys under `onboarding:` object (after `passkeyFailure` line):

```ts
notificationsTitle: "Activar notificaciones",
notificationsDescription: "Recibe alertas de partidos, goles y más. Puedes cambiarlo después en tu perfil.",
notificationsEnable: "Activar notificaciones",
notificationsSkip: "Omitir",
notificationsActivated: "Notificaciones activadas",
notificationsUnsupported: "Tu navegador no soporta notificaciones push.",
notificationsMissingVapid: "Falta configurar las claves de notificación.",
stepNotifications: "Notificaciones",
```

### Step 2: i18n — English (`src/i18n/dictionaries/en.ts`) [x]

Add 7 equivalent keys under `onboarding:` object:

```ts
notificationsTitle: "Enable notifications",
notificationsDescription: "Get alerts for matches, goals, and more. You can change this later in your profile.",
notificationsEnable: "Enable notifications",
notificationsSkip: "Skip",
notificationsActivated: "Notifications enabled",
notificationsUnsupported: "Your browser doesn't support push notifications.",
notificationsMissingVapid: "Notification keys are not configured.",
stepNotifications: "Notifications",
```

### Step 3: `notification-step.tsx` (NEW) [x]

File: `src/features/profile/components/notification-step.tsx`

```ts
"use client";

import { Bell, BellOff, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/dictionary-provider";
import { createClient } from "@/lib/supabase/client";
import { savePushSubscription } from "@/features/notifications/actions/save-subscription";
import { updateNotificationPreferences } from "@/features/notifications/actions/update-preferences";

interface NotificationStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function NotificationStep({ onComplete, onSkip }: NotificationStepProps) {
  const t = useDictionary().onboarding;
  const [pending, setPending] = useState(false);
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  // Edge states: unsupported, missing VAPID, denied
  if (!supported || !vapidPublicKey || (typeof Notification !== "undefined" && Notification.permission === "denied" && !activated)) {
    const message = !supported ? t.notificationsUnsupported : !vapidPublicKey ? t.notificationsMissingVapid : t.notificationsUnsupported; // denied → generic unsupported for simplicity
    return (
      <div className="space-y-6 text-center">
        <BellOff className="mx-auto h-16 w-16 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button className="w-full" onClick={onComplete}>{t.passkeyFinish}</Button>
      </div>
    );
  }

  // Activated state
  if (activated) {
    return (
      <div className="space-y-6 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-semibold">{t.notificationsTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.notificationsActivated}</p>
        </div>
        <Button className="w-full" onClick={onComplete}>{t.passkeyFinish}</Button>
      </div>
    );
  }

  // Ready state: prompt to enable
  async function handleEnable() {
    setPending(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError(t.notificationsSkip); // generic fallback
        setPending(false);
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!),
      });
      const json = subscription.toJSON();
      await savePushSubscription({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });
      // Activate all 5 preferences by default
      await updateNotificationPreferences({
        matchStarted: true,
        matchFinished: true,
        poolInvite: true,
        globalRankImproved: true,
        goalScored: true,
      });
      setActivated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.passkeyFailure);
    }
    setPending(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t.notificationsTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.notificationsDescription}</p>
      </div>
      <div className="flex justify-center">
        <Bell className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <Button className="w-full" disabled={pending} onClick={handleEnable}>
          {pending ? t.passkeySettingUp : t.notificationsEnable}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onSkip}>
          {t.notificationsSkip}
        </Button>
      </div>
    </div>
  );
}
```

Pattern follows `passkey-step.tsx`: icon → title + description → loading state → success state with check icon. Uses `savePushSubscription` and `updateNotificationPreferences` from Unit 10. Standalone `urlBase64ToUint8Array` to avoid importing from `notification-settings-panel.tsx` (which imports other client-only deps).

### Step 4: `onboarding-client.tsx` (MODIFY) [x]

File: `src/app/onboarding/profile/onboarding-client.tsx`

Changes:
1. Add import for `NotificationStep`:
```ts
import { NotificationStep } from "@/features/profile/components/notification-step";
```

2. Extend `Step` type:
```ts
type Step = "nickname" | "avatar" | "rules" | "notifications" | "passkey";
```

3. Extend `STEP_ORDER`:
```ts
const STEP_ORDER: Step[] = ["nickname", "avatar", "rules", "notifications", "passkey"];
```

4. Change `RulesStep.onComplete` (line 91):
```tsx
// Before: onComplete={() => setStep("passkey")}
// After:  onComplete={() => setStep("notifications")}
<RulesStep onComplete={() => setStep("notifications")} onSkip={() => setStep("notifications")} />
```

5. Add `NotificationStep` render block before passkey:
```tsx
{step === "notifications" && (
  <NotificationStep onComplete={() => setStep("passkey")} onSkip={() => setStep("passkey")} />
)}
```

### Step 5: `onboarding-progress-indicator.tsx` (MODIFY) [x]

File: `src/features/profile/components/onboarding-progress-indicator.tsx`

Add new step entry in `STEPS` array, between `stepRules` and `stepPasskey`:
```ts
{ labelKey: "stepNotifications", key: "notifications" },
```

### Step 6: `trigger-sync.ts` (MODIFY) [x]

File: `src/features/admin/actions/trigger-sync.ts`

1. Add import:
```ts
import { dispatchPendingNotifications } from "@/features/notifications/services/dispatcher";
```

2. Add dispatch call after `revalidateResultViews()` (between line 36 and return 37):
```ts
try {
  await dispatchPendingNotifications();
} catch {
  // best-effort: sync/scoring already completed successfully
}
```

### Step 7: Tests [x]

**`src/features/profile/components/__tests__/notification-step.test.tsx` (NEW)**

6 test cases:
1. Renders with "Activar notificaciones" button when VAPID key and push support present
2. "Omitir" button calls `onSkip`
3. Unsupported browser shows fallback message and "Continuar" button → calls `onComplete`
4. Missing VAPID key shows fallback message and "Continuar" button → calls `onComplete`
5. Denied permission shows fallback message and "Continuar" button → calls `onComplete`
6. Clicking "Activar" transitions to `activated` state after `Notification.requestPermission` grants + SW+subscribe succeed

**`src/features/admin/actions/__tests__/trigger-sync.test.ts` (MODIFY)** — add 2 cases:
7. `dispatchPendingNotifications` is called after successful sync + scoring
8. If `dispatchPendingNotifications` throws, error is caught and action still returns `{ success: true }`

### Step 8: Verification [x]

```bash
pnpm exec tsc --noEmit
pnpm exec biome check src/features/profile/components/notification-step.tsx src/app/onboarding/profile/onboarding-client.tsx src/features/profile/components/onboarding-progress-indicator.tsx src/features/admin/actions/trigger-sync.ts src/i18n/dictionaries/es.ts src/i18n/dictionaries/en.ts
pnpm exec eslint src/features/profile/components/notification-step.tsx src/app/onboarding/profile/onboarding-client.tsx src/features/profile/components/onboarding-progress-indicator.tsx src/features/admin/actions/trigger-sync.ts
pnpm exec vitest run src/features/profile/components/__tests__/notification-step.test.tsx src/features/admin/actions/__tests__/trigger-sync.test.ts
pnpm build
```

## Architecture Notes

- **No `"use server"` directive** in `notification-step.tsx` — it's a pure client component like `passkey-step.tsx`
- **`urlBase64ToUint8Array` duplicated** intentionally to avoid importing from `NotificationSettingsPanel` (client component with extra deps)
- **`savePushSubscription` and `updateNotificationPreferences`** are server actions imported via module path — they work from any client component
- **`createClient()` import** not needed for this step; the server actions handle Supabase internally
- **`passkeyFinish` reuse**: the "Continuar" button in edge states reuses `t.passkeyFinish` ("Terminar configuración") since that key already means "continue to next step"
- **`passkeySettingUp` reuse**: "Configurando…" reused for notification activation pending state
- **`passkeyFailure` reuse**: generic error message reused for notification push failure

## Files Summary

| # | File | Action | Lines |
|---|------|--------|-------|
| 1 | `src/i18n/dictionaries/es.ts` | MODIFY | +7 keys |
| 2 | `src/i18n/dictionaries/en.ts` | MODIFY | +7 keys |
| 3 | `src/features/profile/components/notification-step.tsx` | NEW | ~90 |
| 4 | `src/app/onboarding/profile/onboarding-client.tsx` | MODIFY | +5, ~2 changed |
| 5 | `src/features/profile/components/onboarding-progress-indicator.tsx` | MODIFY | +1 line |
| 6 | `src/features/admin/actions/trigger-sync.ts` | MODIFY | +5 lines |
| 7 | `src/features/profile/components/__tests__/notification-step.test.tsx` | NEW | ~100 |
| 8 | `src/features/admin/actions/__tests__/trigger-sync.test.ts` | MODIFY | +25 |

**Total**: 2 new files, 6 modified files. No schema, migrations, routes, env vars, packages, or config changes.
