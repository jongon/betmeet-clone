import { cookies, headers } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, type Locale, localeFromAcceptLanguage, parseLocale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/current-user";

export const LOCALE_COOKIE = "locale";

export const getRequestLocale = cache(async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const cookieLocale = parseLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  if (cookieLocale) return cookieLocale;

  const user = await getAuthUser();
  if (user) {
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { locale: true },
    });
    const profileLocale = parseLocale(profile?.locale);
    if (profileLocale) return profileLocale;
  }

  const acceptLanguage = (await headers()).get("accept-language");
  return localeFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
});
