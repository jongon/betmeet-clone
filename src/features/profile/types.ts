export type VerificationStatus = "UNVERIFIED" | "VERIFIED" | "ADMIN";
export type AvatarSource = "GOOGLE_PHOTO" | "DEFAULT_SET" | "CUSTOM_UPLOAD";

export interface Profile {
  id: string;
  nicknameBase: string | null;
  nicknameDiscriminator: string | null;
  avatarUrl: string;
  avatarSource: AvatarSource;
  verificationStatus: VerificationStatus;
  mfaEnabled: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvatarAsset {
  id: string;
  name: string;
  storagePath: string;
  storageUrl: string;
  displayOrder: number;
}

export function getDisplayNickname(
  profile: Pick<Profile, "nicknameBase" | "nicknameDiscriminator">,
): string {
  if (!profile.nicknameBase) return "Anonymous";
  if (!profile.nicknameDiscriminator) return profile.nicknameBase;
  return `${profile.nicknameBase}#${profile.nicknameDiscriminator}`;
}
