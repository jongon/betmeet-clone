import Link from "next/link";
import { redirect } from "next/navigation";
import { SessionList } from "@/components/admin/session-list";
import type { Session } from "@/lib/sessions";
import { getAllSessions } from "@/lib/sessions-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function sortArchivedSessions(sessions: Session[]): Session[] {
  return sessions.sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));
}

export default async function AdminArchivedSessionsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login?next=/admin/archivadas");
  }

  const sessions = sortArchivedSessions(
    (await getAllSessions()).filter((session) => Boolean(session.archivedAt)),
  );

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="space-y-3">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h1 className="font-display text-3xl tracking-tight text-foreground">
              Sesiones archivadas
            </h1>
            <p className="text-sm text-muted-foreground">
              Historial separado del inbox principal para revisar cierres anteriores.
            </p>
          </div>
          <Link
            href="/admin"
            className="group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background bg-clip-padding text-[0.8rem] font-medium whitespace-nowrap transition-all outline-none select-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-muted-foreground"
          >
            Volver a sesiones
          </Link>
        </div>
      </header>

      <SessionList
        sessions={sessions}
        emptyTitle="Sin sesiones archivadas"
        emptyDescription="Cuando archives sesiones cerradas desde /admin, aparecerán aquí."
        noFilterDescription="No hay sesiones archivadas en este estado."
      />
    </main>
  );
}
