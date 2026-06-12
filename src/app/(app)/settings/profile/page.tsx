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
import { es } from "@/i18n/dictionaries/es";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const [profile, defaultAvatars, notificationSettings] = await Promise.all([
    getProfile(),
    getDefaultAvatars(),
    getNotificationSettings(),
  ]);
  if (!profile) redirect("/sign-in");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Image
              src={profile.avatarUrl}
              alt="Your avatar"
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover"
              unoptimized
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
          <CardTitle>{es.profile.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountSettings currentNicknameBase={profile.nicknameBase ?? ""} />
        </CardContent>
      </Card>
      {notificationSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Notificaciones web push</CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationSettingsPanel {...notificationSettings} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
