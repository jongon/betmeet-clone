import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { RecentRunsTable } from "@/features/admin/components/recent-runs-table";
import { SyncStatusPanel } from "@/features/admin/components/sync-status-panel";
import { TriggerSyncControls } from "@/features/admin/components/trigger-sync-controls";
import { getSyncDashboard } from "@/features/admin/queries";

export const metadata: Metadata = { title: "Admin · Sincronización" };

export default async function AdminDashboardPage() {
  const data = await getSyncDashboard();
  if (!data) notFound(); // not an admin (BR-7.1)

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Panel de administración</h1>
        <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/admin/matches">
          Forzar resultados
        </Link>
      </div>

      <TriggerSyncControls />
      <SyncStatusPanel data={data} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Sincronizaciones recientes</h2>
        <RecentRunsTable runs={data.recentRuns} />
      </section>
    </main>
  );
}
