"use client";

import { Bell, BellOff, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { savePushSubscription } from "@/features/notifications/actions/save-subscription";
import { updateNotificationPreferences } from "@/features/notifications/actions/update-preferences";
import { useDictionary } from "@/i18n/dictionary-provider";

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
  const supported =
    typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  if (
    !supported ||
    !vapidPublicKey ||
    (typeof Notification !== "undefined" && Notification.permission === "denied" && !activated)
  ) {
    const message = !supported
      ? t.notificationsUnsupported
      : !vapidPublicKey
        ? t.notificationsMissingVapid
        : t.notificationsUnsupported;
    return (
      <div className="space-y-6 text-center">
        <BellOff className="mx-auto h-16 w-16 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button
          className="w-full"
          onClick={onComplete}
          data-testid="notification-unsupported-continue"
        >
          {t.passkeyFinish}
        </Button>
      </div>
    );
  }

  if (activated) {
    return (
      <div className="space-y-6 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-semibold">{t.notificationsTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.notificationsActivated}</p>
        </div>
        <Button
          className="w-full"
          onClick={onComplete}
          data-testid="notification-activated-continue"
        >
          {t.passkeyFinish}
        </Button>
      </div>
    );
  }

  async function handleEnable() {
    setPending(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError(t.notificationsSkip);
        setPending(false);
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          // biome-ignore lint/style/noNonNullAssertion: guarded by !vapidPublicKey check above
          vapidPublicKey!,
        ),
      });
      const json = subscription.toJSON();
      await savePushSubscription({
        // biome-ignore lint/style/noNonNullAssertion: PushSubscription.toJSON guarantees these fields
        endpoint: json.endpoint!,
        keys: {
          // biome-ignore lint/style/noNonNullAssertion: PushSubscription.toJSON guarantees these fields
          p256dh: json.keys!.p256dh,
          // biome-ignore lint/style/noNonNullAssertion: PushSubscription.toJSON guarantees these fields
          auth: json.keys!.auth,
        },
      });
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
      <FormError messages={error ? [error] : undefined} />

      <div className="space-y-2">
        <Button
          className="w-full"
          disabled={pending}
          onClick={handleEnable}
          data-testid="notification-enable"
        >
          {pending ? t.passkeySettingUp : t.notificationsEnable}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onSkip} data-testid="notification-skip">
          {t.notificationsSkip}
        </Button>
      </div>
    </div>
  );
}
