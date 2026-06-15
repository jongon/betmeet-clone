"use client";

import { useState, useTransition } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDictionary, useLocale } from "@/i18n/dictionary-provider";
import {
  deactivateAllPushSubscriptions,
  deactivatePushSubscription,
} from "../actions/deactivate-subscription";
import { savePushSubscription } from "../actions/save-subscription";
import { updateNotificationPreferences } from "../actions/update-preferences";
import type { NotificationPreferenceState } from "../types";

interface NotificationSettingsPanelProps {
  vapidPublicKey: string;
  preferences: NotificationPreferenceState;
  subscriptions: {
    id: string;
    userAgent: string;
    createdAt: string;
    lastSuccessAt: string | null;
  }[];
}

const PREFERENCE_KEYS = [
  "matchStarted",
  "matchFinished",
  "poolInvite",
  "globalRankImproved",
  "goalScored",
] as const satisfies readonly (keyof NotificationPreferenceState)[];

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function NotificationSettingsPanel({
  vapidPublicKey,
  preferences,
  subscriptions,
}: NotificationSettingsPanelProps) {
  const t = useDictionary().notifications;
  const locale = useLocale();
  const [current, setCurrent] = useState(preferences);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const supported =
    typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  function savePreferences(next: NotificationPreferenceState) {
    setCurrent(next);
    setMessage(null);
    startTransition(async () => {
      const result = await updateNotificationPreferences(next);
      if (result?.error) setMessage(result.error);
    });
  }

  async function enablePush() {
    setMessage(null);
    if (!supported) {
      setMessage(t.unsupported);
      return;
    }
    if (!vapidPublicKey) {
      setMessage(t.missingVapid);
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setMessage(t.denied);
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    startTransition(async () => {
      const result = await savePushSubscription(subscription.toJSON());
      if (result?.error) setMessage(result.error);
    });
  }

  return (
    <div className="space-y-5">
      <FormError messages={message ? [message] : undefined} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={enablePush} disabled={pending}>
          {t.enable}
        </Button>
        {subscriptions.length > 0 && (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await deactivateAllPushSubscriptions();
              });
            }}
          >
            {t.disableAll}
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {PREFERENCE_KEYS.map((key) => (
          <div key={key} className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-1">
              <Label htmlFor={`notification-${key}`}>{t[key]}</Label>
              <p className="text-sm text-muted-foreground">{t[`${key}Description`]}</p>
            </div>
            <Switch
              id={`notification-${key}`}
              checked={current[key]}
              disabled={pending}
              onCheckedChange={(checked) => savePreferences({ ...current, [key]: checked })}
            />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="font-medium">{t.activeDevices}</p>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noDevices}</p>
        ) : (
          subscriptions.map((subscription) => (
            <div
              key={subscription.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{subscription.userAgent}</p>
                <p className="text-xs text-muted-foreground">
                  {t.activated} {new Date(subscription.createdAt).toLocaleDateString(locale)}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    await deactivatePushSubscription(subscription.id);
                  });
                }}
              >
                {t.disable}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
