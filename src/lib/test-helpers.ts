import { prisma } from "@/lib/prisma";

export async function cleanDatabase(): Promise<void> {
  await prisma.proposalBlock.deleteMany();
  await prisma.requestedRepeated.deleteMany();
  await prisma.sessionProposal.deleteMany();
  await prisma.session.deleteMany();
  await prisma.qrToken.deleteMany();
  await prisma.repeatedInventory.deleteMany();
  await prisma.missingInventory.deleteMany();
  await prisma.exchangeSettings.deleteMany();
}
