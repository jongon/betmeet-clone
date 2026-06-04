import { redirect } from "next/navigation";
import { RepeatedsPanel } from "@/components/admin/repeateds-panel";
import { getAlbumGroups, getAlbumTotal } from "@/lib/album-catalog";
import { getExchangeSettings } from "@/lib/exchange-settings-store";
import { getInventory } from "@/lib/repeateds-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function RepeatedsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/admin/login?next=/admin/cromos");
  }

  const groups = getAlbumGroups();
  const initialGroup = groups[0]?.groupCode ?? "FWC";
  const inventory = await getInventory(user.email);
  const exchangeSettings = await getExchangeSettings(user.email);

  return (
    <RepeatedsPanel
      groups={groups}
      initialGroup={initialGroup}
      totalStickers={getAlbumTotal()}
      initialItems={inventory.items}
      initialGlobalSettings={exchangeSettings.global}
      initialOverrides={exchangeSettings.overrides}
    />
  );
}
