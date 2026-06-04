import Link from "next/link";
import { redirect } from "next/navigation";
import { RepeatedsSettingsPanel } from "@/components/admin/repeateds-settings-panel";
import { getExchangeSettings } from "@/lib/exchange-settings-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ExchangeSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/admin/login?next=/admin/intercambio");
  }

  const exchangeSettings = await getExchangeSettings(user.email);

  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col gap-6 px-4 py-10">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl tracking-tight text-foreground">
            Settings de intercambio
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Configura reglas globales del album para los cromos sin override.
        </p>
        <Link
          href="/admin"
          className="inline-flex text-xs font-medium text-primary hover:underline"
        >
          Volver al home admin
        </Link>
      </header>

      <RepeatedsSettingsPanel globalSettings={exchangeSettings.global} />
    </main>
  );
}
