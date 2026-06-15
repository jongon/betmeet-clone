import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { AdminMatchList } from "@/features/admin/components/admin-match-list";
import { getAdminMatches } from "@/features/admin/queries";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getRequestLocale());
  return { title: `Admin · ${dictionary.pages.forceResults}` };
}

export default async function AdminMatchesPage() {
  const dictionary = getDictionary(await getRequestLocale());
  const matches = await getAdminMatches();
  if (!matches) notFound(); // not an admin (BR-7.1)

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link className={buttonVariants({ variant: "ghost" })} href="/admin">
        {dictionary.nav.backToApp}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{dictionary.pages.forceResults}</h1>
      <p className="text-sm text-muted-foreground">{dictionary.pages.adminMatchesDescription}</p>
      <AdminMatchList matches={matches} />
    </main>
  );
}
