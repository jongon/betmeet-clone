import { prisma } from "@/lib/prisma";

export async function syncProfileVerification(userId: string, emailConfirmed: boolean) {
  if (!emailConfirmed) return;

  await prisma.profile.updateMany({
    where: {
      id: userId,
      verificationStatus: "UNVERIFIED",
    },
    data: {
      verificationStatus: "VERIFIED",
    },
  });
}
