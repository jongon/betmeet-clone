import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile } from "@/features/profile/queries";
import { createClient } from "@/lib/supabase/server";
import { SecuritySettingsClient } from "./security-client";

export const metadata: Metadata = { title: "Security settings" };

export default async function SecuritySettingsPage() {
  const supabase = await createClient();
  const [profile, { data: factorsData }] = await Promise.all([
    getProfile(),
    supabase.auth.mfa.listFactors(),
  ]);

  if (!profile) redirect("/sign-in");

  const totpFactors = factorsData?.totp ?? [];

  return (
    <SecuritySettingsClient
      mfaEnabled={profile.mfaEnabled}
      totpFactors={totpFactors.map((f) => ({
        id: f.id,
        friendlyName: f.friendly_name ?? "Authenticator app",
      }))}
    />
  );
}
