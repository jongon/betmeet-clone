import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile } from "@/features/profile/queries";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import { SecuritySettingsClient } from "./security-client";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getRequestLocale());
  return { title: dictionary.settings.securityTitle };
}

export default async function SecuritySettingsPage() {
  const dictionary = getDictionary(await getRequestLocale());
  const supabase = await createClient();
  const [profile, { data: factorsData }, { data: passkeysData }] = await Promise.all([
    getProfile(),
    supabase.auth.mfa.listFactors(),
    supabase.auth.passkey.list(),
  ]);

  if (!profile) redirect("/sign-in");

  const totpFactors = factorsData?.totp ?? [];
  const passkeys =
    passkeysData?.map((p) => ({
      id: p.id,
      friendlyName: p.friendly_name ?? dictionary.settings.passkeyDefaultName,
      createdAt: p.created_at,
      lastUsedAt: p.last_used_at ?? null,
    })) ?? [];

  return (
    <SecuritySettingsClient
      mfaEnabled={profile.mfaEnabled}
      totpFactors={totpFactors.map((f) => ({
        id: f.id,
        friendlyName: f.friendly_name ?? dictionary.settings.authenticatorApp,
      }))}
      passkeys={passkeys}
    />
  );
}
