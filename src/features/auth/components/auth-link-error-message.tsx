"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useDictionary } from "@/i18n/dictionary-provider";

function messageFor(
  error: string | undefined,
  messages: ReturnType<typeof useDictionary>["auth"]["linkErrors"],
) {
  if (!error) return null;
  if (error === "email_link_invalid") return messages.missing_token;
  if (error === "exchange_failed") return messages.exchange_failed;
  if (error === "verify_failed") return messages.invalid;
  if (error === "otp_expired") return messages.expired;
  if (error === "access_denied") return messages.access_denied;
  return messages.fallback;
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
  const messages = useDictionary().auth.linkErrors;
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

  const message = messageFor(hashError ?? error, messages);
  if (!message) return null;

  return (
    <div role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </div>
  );
}
