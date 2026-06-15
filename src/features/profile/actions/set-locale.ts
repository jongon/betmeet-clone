"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { type Locale, parseLocale } from "@/i18n/config";
import { LOCALE_COOKIE } from "@/lib/locale";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/current-user";

export async function setLocale(localeValue: Locale, path = "/matches") {
  const locale = parseLocale(localeValue);

  if (!locale) {
    return { error: "unsupported_locale" as const };
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  const user = await getAuthUser();
  if (user) {
    await prisma.profile.updateMany({
      where: { id: user.id },
      data: { locale },
    });
  }

  revalidatePath(path);
  return { success: true as const, locale };
}
