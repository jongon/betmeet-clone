import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PoolSearchBar({
  query,
  onlyWithCapacity,
}: {
  query: string;
  onlyWithCapacity: boolean;
}) {
  return (
    <form
      className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
      data-testid="pool-search-bar"
    >
      <div className="space-y-2">
        <Label htmlFor="pool-query">Buscar ligas públicas</Label>
        <Input id="pool-query" name="q" defaultValue={query} placeholder="Nombre de la liga" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="withCapacity" value="1" defaultChecked={onlyWithCapacity} />
        Con cupo
      </label>
      <Button type="submit">Buscar</Button>
    </form>
  );
}
