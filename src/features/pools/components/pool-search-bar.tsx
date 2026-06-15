"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/i18n/dictionary-provider";

export function PoolSearchBar({
  query,
  onlyWithCapacity,
}: {
  query: string;
  onlyWithCapacity: boolean;
}) {
  const t = useDictionary().pools;

  return (
    <form
      className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
      data-testid="pool-search-bar"
    >
      <div className="space-y-2">
        <Label htmlFor="pool-query">{t.searchLabel}</Label>
        <Input id="pool-query" name="q" defaultValue={query} placeholder={t.searchPlaceholder} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="withCapacity" value="1" defaultChecked={onlyWithCapacity} />
        {t.hasCapacity}
      </label>
      <Button type="submit">{t.search}</Button>
    </form>
  );
}
