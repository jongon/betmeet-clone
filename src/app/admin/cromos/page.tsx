import { RepeatedsPanel } from "@/components/admin/repeateds-panel";
import { getAlbumGroups, getAlbumTotal } from "@/lib/album-catalog";
import { getMissingInventory } from "@/lib/missing-store";
import { getInventory } from "@/lib/repeateds-store";
import { getAdminEmail } from "@/lib/supabase/server";

export default async function RepeatedsPage() {
  const email = await getAdminEmail();

  const groups = getAlbumGroups();
  const initialGroup = groups[0]?.groupCode ?? "FWC";
  const [inventory, missingInventory] = await Promise.all([
    getInventory(email),
    getMissingInventory(email),
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
