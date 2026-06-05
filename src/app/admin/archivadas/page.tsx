import { AdminNavLink } from "@/components/admin/nav-link";
import { SessionList } from "@/components/admin/session-list";
import type { Session } from "@/lib/sessions";
import { getAllSessions } from "@/lib/sessions-store";
import { getAdminEmail } from "@/lib/supabase/server";

function sortArchivedSessions(sessions: Session[]): Session[] {
  return sessions.sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));
}

export default async function AdminArchivedSessionsPage() {
  void (await getAdminEmail());

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
          <AdminNavLink href="/admin">Volver a sesiones</AdminNavLink>
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
