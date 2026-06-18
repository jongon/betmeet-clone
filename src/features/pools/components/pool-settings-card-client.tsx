"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/form-error";
import { Switch } from "@/components/ui/switch";
import { useDictionary } from "@/i18n/dictionary-provider";
import { updatePoolMembersCanInvite } from "../actions/update-pool-members-can-invite";

interface PoolSettingsCardClientProps {
  poolId: string;
  initialMembersCanInvite: boolean;
}

export function PoolSettingsCardClient({
  poolId,
  initialMembersCanInvite,
}: PoolSettingsCardClientProps) {
  const t = useDictionary().pools;
  const [checked, setChecked] = useState(initialMembersCanInvite);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setError(null);
    const previous = checked;
    setChecked(next); // optimistic
    startTransition(async () => {
      const result = await updatePoolMembersCanInvite({ poolId, membersCanInvite: next });
      if (result?.error) {
        setError(result.error);
        setChecked(previous); // rollback
        return;
      }
      toast.success(t.settings.saved);
    });
  }

  return (
    <section
      data-testid="pool-settings-card"
      className="space-y-3 rounded-lg border border-border bg-card p-4"
    >
      <header className="space-y-1">
        <h2 className="text-base font-semibold">{t.settings.title}</h2>
        <p className="text-sm text-muted-foreground">{t.settings.subtitle}</p>
      </header>
      <FormError messages={error ? [error] : undefined} />
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">{t.settings.membersCanInvite}</p>
          <p className="text-xs text-muted-foreground">{t.settings.membersCanInviteDescription}</p>
        </div>
        <Switch
          checked={checked}
          onCheckedChange={handleChange}
          disabled={pending}
          data-testid="pool-settings-members-can-invite-switch"
          aria-label={t.settings.membersCanInvite}
        />
      </div>
    </section>
  );
}
