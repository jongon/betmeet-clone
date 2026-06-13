"use client";

import { useEffect, useSyncExternalStore } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  email_link_invalid: "El enlace de confirmación no es válido o ya expiró. Solicita uno nuevo.",
  exchange_failed:
    "No pudimos completar la confirmación. Intenta iniciar sesión o solicita otro enlace.",
  verify_failed: "No pudimos verificar el enlace. Puede estar vencido o ya usado.",
  otp_expired: "El enlace de confirmación expiró o ya fue usado. Solicita uno nuevo.",
  access_denied: "Supabase rechazó el enlace de confirmación. Solicita uno nuevo.",
};

function messageFor(error: string | undefined) {
  if (!error) return null;
  return ERROR_MESSAGES[error] ?? "No pudimos completar la autenticación. Intenta de nuevo.";
}

let currentHashError: string | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return currentHashError;
}

function getServerSnapshot() {
  return null;
}

function setCurrentHashError(error: string) {
  currentHashError = error;
  for (const listener of listeners) listener();
}

export function AuthLinkErrorMessage({ error }: { error?: string }) {
  const hashError = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!window.location.hash) return;

    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const errorCode = hashParams.get("error_code") ?? hashParams.get("error");
    if (!errorCode) return;

    setCurrentHashError(errorCode);
    const cleanUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, "", cleanUrl);
  }, []);

  const message = messageFor(hashError ?? error);
  if (!message) return null;

  return (
    <div role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </div>
  );
}
