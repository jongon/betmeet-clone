import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { NotificationSettingsPanel } from "@/features/notifications/components/notification-settings-panel";
import { getNotificationSettings } from "@/features/notifications/queries";
import { AccountSettings } from "@/features/profile/components/account-settings";
import { AvatarSourceTabs } from "@/features/profile/components/avatar-source-tabs";
import { getDefaultAvatars, getProfile } from "@/features/profile/queries";
import { getDisplayNickname } from "@/features/profile/types";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";
import { getAuthUser } from "@/lib/supabase/current-user";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getRequestLocale());
  return { title: dictionary.settings.profileTitle };
}

export default async function ProfileSettingsPage() {
  const dictionary = getDictionary(await getRequestLocale());
  const [profile, defaultAvatars, notificationSettings, user] = await Promise.all([
    getProfile(),
    getDefaultAvatars(),
    getNotificationSettings(),
    getAuthUser(),
  ]);
  if (!profile) redirect("/sign-in");
  const currentEmail = user?.email ?? "";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{dictionary.profile.avatarSection}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Image
              src={profile.avatarUrl}
              alt={dictionary.profile.avatarAlt}
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover"
              priority
            />
            <div>
              <p className="font-medium">{getDisplayNickname(profile)}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {profile.avatarSource.replace("_", " ").toLowerCase()}
              </p>
            </div>
          </div>
          <Separator />
          <AvatarSourceTabs defaultAvatars={defaultAvatars} currentAvatarUrl={profile.avatarUrl} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{dictionary.profile.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountSettings
            currentNicknameBase={profile.nicknameBase ?? ""}
            currentEmail={currentEmail}
          />
        </CardContent>
      </Card>
      {notificationSettings && (
        <Card>
          <CardHeader>
            <CardTitle>{dictionary.settings.webPush}</CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationSettingsPanel {...notificationSettings} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
