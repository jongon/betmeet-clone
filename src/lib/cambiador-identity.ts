import { randomUUID } from "node:crypto";

export const CAMBIADOR_COOKIE = "cambiador_id";
const CAMBIO_SESSION_COOKIE_PREFIX = "cambio_session_";

type ReadableCookieStore = {
  get: (name: string) => { value?: string } | undefined;
};

type MutableCookieStore = ReadableCookieStore & {
  set: (
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      sameSite: "lax";
      secure: boolean;
      path: string;
      maxAge: number;
    },
  ) => void;
};

export function getCambiadorId(cookieStore: ReadableCookieStore): string | null {
  const existing = cookieStore.get(CAMBIADOR_COOKIE)?.value;
  return existing && existing.length > 0 ? existing : null;
}

export function getOrCreateCambiadorId(cookieStore: MutableCookieStore): string {
  const existing = getCambiadorId(cookieStore);
  if (existing) return existing;

  const created = randomUUID();
  cookieStore.set(CAMBIADOR_COOKIE, created, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return created;
}

function getCambioSessionCookieName(token: string): string {
  return `${CAMBIO_SESSION_COOKIE_PREFIX}${token}`;
}

export function getCambioSessionId(cookieStore: ReadableCookieStore, token: string): string | null {
  const existing = cookieStore.get(getCambioSessionCookieName(token))?.value;
  return existing && existing.length > 0 ? existing : null;
}

export function setCambioSessionId(
  cookieStore: MutableCookieStore,
  token: string,
  sessionId: string,
): void {
  cookieStore.set(getCambioSessionCookieName(token), sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
}
