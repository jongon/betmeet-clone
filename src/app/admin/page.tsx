import { redirect } from "next/navigation";
import { SessionList } from "@/components/admin/session-list";
import { SignOutButton } from "@/components/admin/sign-out-button";
import type { Session } from "@/lib/sessions";
import { getAllSessions } from "@/lib/sessions-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function sortSessions(sessions: Session[]): Session[] {
  const open = sessions
    .filter((s) => s.status === "open")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const closed = sessions.filter((s) => s.status === "closed");
  return [...open, ...closed];
}

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login?next=/admin");
  }

  const sessions = sortSessions(await getAllSessions());
  const openCount = sessions.filter((s) => s.status === "open").length;

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="space-y-3">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl tracking-tight text-foreground">
              Sesiones de cambio
            </h1>
            {openCount > 0 ? (
              <span className="inline-flex h-5 items-center rounded-full bg-brand px-2 text-xs font-medium text-brand-foreground">
                {openCount} {openCount === 1 ? "abierta" : "abiertas"}
              </span>
            ) : null}
          </div>
          <SignOutButton />
        </div>
        <p className="text-sm text-muted-foreground">
          Sesión iniciada como <span className="font-medium text-foreground">{user.email}</span>
        </p>
      </header>

      <SessionList sessions={sessions} />
    </main>
  );
}
