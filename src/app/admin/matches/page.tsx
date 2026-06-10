import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { AdminMatchList } from "@/features/admin/components/admin-match-list";
import { getAdminMatches } from "@/features/admin/queries";

export const metadata: Metadata = { title: "Admin · Forzar resultados" };

export default async function AdminMatchesPage() {
  const matches = await getAdminMatches();
  if (!matches) notFound(); // not an admin (BR-7.1)

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link className={buttonVariants({ variant: "ghost" })} href="/admin">
        Volver al panel
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Forzar resultados</h1>
      <p className="text-sm text-muted-foreground">
        El override es un fallback: el próximo sync de la API puede sobrescribirlo.
      </p>
      <AdminMatchList matches={matches} />
    </main>
  );
}
