import { MissingPanel } from "@/components/admin/missing-panel";
import { getAlbumGroups, getAlbumTotal } from "@/lib/album-catalog";
import { getMissingInventory } from "@/lib/missing-store";
import { getInventory } from "@/lib/repeateds-store";
import { getAdminEmail } from "@/lib/supabase/server";

export default async function MissingStickersPage() {
  const email = await getAdminEmail();

  const groups = getAlbumGroups();
  const [missingInventory, repeatedInventory] = await Promise.all([
    getMissingInventory(email),
    getInventory(email),
  ]);

  return (
    <MissingPanel
      groups={groups}
      totalStickers={getAlbumTotal()}
      initialItems={missingInventory.items}
      repeatedItems={repeatedInventory.items}
    />
  );
}
