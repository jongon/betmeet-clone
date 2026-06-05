import { redirect } from "next/navigation";
import { RepeatedsPanel } from "@/components/admin/repeateds-panel";
import { getAlbumGroups, getAlbumTotal } from "@/lib/album-catalog";
import { getMissingInventory } from "@/lib/missing-store";
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
  const [inventory, missingInventory] = await Promise.all([
    getInventory(user.email),
    getMissingInventory(user.email),
  ]);
  const initialItems = Object.fromEntries(
    Object.entries(inventory.items).filter(([code]) => !missingInventory.items[code]),
  );

  return (
    <RepeatedsPanel
      groups={groups}
      initialGroup={initialGroup}
      totalStickers={getAlbumTotal()}
      initialItems={initialItems}
      missingItems={missingInventory.items}
    />
  );
}
