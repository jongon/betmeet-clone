"use client";

import { useState, useTransition } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDictionary } from "@/i18n/dictionary-provider";
import { createPool } from "../actions/create-pool";
import type { PoolType } from "../types";

export function CreatePoolForm() {
  const t = useDictionary().pools;
  const [name, setName] = useState("");
  const [type, setType] = useState<PoolType>("PUBLIC");
  const [capacity, setCapacity] = useState(20);
  const [membersCanInvite, setMembersCanInvite] = useState(true); // Unit 45: BR-45.2
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleTypeChange(next: PoolType) {
    setType(next);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createPool({ name, type, capacity, membersCanInvite });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={submit} className="space-y-5" data-testid="create-pool-form">
      <FormError messages={error ? [error] : undefined} />

      <div className="space-y-2">
        <Label htmlFor="pool-name">{t.name}</Label>
        <Input
          id="pool-name"
          name="name"
          minLength={3}
          maxLength={60}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t.namePlaceholder}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pool-type">{t.visibility}</Label>
          <select
            id="pool-type"
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
            value={type}
            onChange={(event) => handleTypeChange(event.target.value as PoolType)}
          >
            <option value="PUBLIC">{t.public}</option>
            <option value="PRIVATE">{t.private}</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pool-capacity">{t.capacity}</Label>
          <Input
            id="pool-capacity"
            name="capacity"
            type="number"
            min={2}
            max={100}
            required
            value={capacity}
            onChange={(event) => setCapacity(Number(event.target.value))}
          />
        </div>
      </div>

      {type === "PRIVATE" && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
          <div className="space-y-1">
            <Label htmlFor="pool-members-can-invite">{t.membersCanInvite}</Label>
            <p className="text-xs text-muted-foreground">{t.membersCanInviteDescription}</p>
          </div>
          <Switch
            id="pool-members-can-invite"
            checked={membersCanInvite}
            onCheckedChange={setMembersCanInvite}
            data-testid="create-pool-members-can-invite"
            aria-label={t.membersCanInvite}
          />
        </div>
      )}

      <Button type="submit" disabled={pending} data-testid="create-pool-submit">
        {pending ? t.creating : t.create}
      </Button>
    </form>
  );
}
