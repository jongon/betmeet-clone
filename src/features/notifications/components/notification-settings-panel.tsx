"use client";

import { useState, useTransition } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

const PREFERENCE_COPY: {
  key: keyof NotificationPreferenceState;
  label: string;
  description: string;
}[] = [
  {
    key: "matchStarted",
    label: "Empieza un partido",
    description: "Aviso cuando un partido pasa a en vivo.",
  },
  {
    key: "matchFinished",
    label: "Termina un partido",
    description: "Aviso cuando se registra el resultado final.",
  },
  {
    key: "poolInvite",
    label: "Invitación a liga",
    description: "Aviso cuando te invitan por nickname o email.",
  },
  {
    key: "globalRankImproved",
    label: "Subo en ranking global",
    description: "Aviso cuando mejora tu posición global.",
  },
  {
    key: "goalScored",
    label: "Gol anotado",
    description: "Aviso cuando cambia el marcador en vivo.",
  },
];

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
      setMessage("Este navegador no soporta web push.");
      return;
    }
    if (!vapidPublicKey) {
      setMessage("Falta configurar NEXT_PUBLIC_VAPID_PUBLIC_KEY.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setMessage("Permiso denegado. Puedes reactivarlo desde la configuración del navegador.");
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
          Activar web push en este navegador
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
            Desactivar todos
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {PREFERENCE_COPY.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-4 rounded-lg border p-3"
          >
            <div className="space-y-1">
              <Label htmlFor={`notification-${item.key}`}>{item.label}</Label>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <Switch
              id={`notification-${item.key}`}
              checked={current[item.key]}
              disabled={pending}
              onCheckedChange={(checked) => savePreferences({ ...current, [item.key]: checked })}
            />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="font-medium">Dispositivos activos</p>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no activaste web push en ningún navegador.
          </p>
        ) : (
          subscriptions.map((subscription) => (
            <div
              key={subscription.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{subscription.userAgent}</p>
                <p className="text-xs text-muted-foreground">
                  Activado {new Date(subscription.createdAt).toLocaleDateString()}
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
                Desactivar
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
