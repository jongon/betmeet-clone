import { redirect } from "next/navigation";
import { MissingPanel } from "@/components/admin/missing-panel";
import { getAlbumGroups, getAlbumTotal } from "@/lib/album-catalog";
import { getMissingInventory } from "@/lib/missing-store";
import { getInventory } from "@/lib/repeateds-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MissingStickersPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/admin/login?next=/admin/cromos/faltantes");
  }

  const groups = getAlbumGroups();
  const [missingInventory, repeatedInventory] = await Promise.all([
    getMissingInventory(user.email),
    getInventory(user.email),
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
