"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDictionary } from "@/i18n/dictionary-provider";
import { renamePool } from "../actions/rename-pool";
import { updatePoolMembersCanInvite } from "../actions/update-pool-members-can-invite";
import type { PoolType } from "../types";

interface PoolSettingsCardClientProps {
  poolId: string;
  poolType: PoolType;
  initialName: string;
  initialMembersCanInvite: boolean;
}

export function PoolSettingsCardClient({
  poolId,
  poolType,
  initialName,
  initialMembersCanInvite,
}: PoolSettingsCardClientProps) {
  const t = useDictionary().pools;
  const [checked, setChecked] = useState(initialMembersCanInvite);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Unit 54: renombrado con confirmación.
  const [name, setName] = useState(initialName);
  const [draftName, setDraftName] = useState(initialName);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renamePending, startRenameTransition] = useTransition();

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

  const trimmedDraft = draftName.trim();
  const renameChanged = trimmedDraft !== name && trimmedDraft.length > 0;

  function openRenameConfirm() {
    setRenameError(null);
    if (renameChanged) setConfirmOpen(true);
  }

  function handleRenameConfirm() {
    setRenameError(null);
    startRenameTransition(async () => {
      const result = await renamePool({ poolId, name: trimmedDraft });
      if (result?.error) {
        setRenameError(result.error);
        return;
      }
      if (result?.name) {
        setName(result.name);
        setDraftName(result.name);
      }
      setConfirmOpen(false);
      toast.success(t.settings.renameSaved);
    });
  }

  return (
    <section
      data-testid="pool-settings-card"
      className="space-y-4 rounded-lg border border-border bg-card p-4"
    >
      <header className="space-y-1">
        <h2 className="text-base font-semibold">{t.settings.title}</h2>
        <p className="text-sm text-muted-foreground">{t.settings.subtitle}</p>
      </header>

      {/* Unit 54: renombrar la liga (todas las ligas del dueño). */}
      <div className="space-y-2">
        <Label htmlFor="pool-rename-input" className="text-sm font-medium">
          {t.settings.renameLabel}
        </Label>
        <p className="text-xs text-muted-foreground">{t.settings.renameDescription}</p>
        <div className="flex items-start gap-2">
          <Input
            id="pool-rename-input"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            maxLength={60}
            disabled={renamePending}
            data-testid="pool-settings-rename-input"
            aria-label={t.settings.renameLabel}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!renameChanged || renamePending}
            onClick={openRenameConfirm}
            data-testid="pool-settings-rename-button"
          >
            {t.settings.renameButton}
          </Button>
        </div>
      </div>

      {poolType === "PRIVATE" && (
        <>
          <FormError messages={error ? [error] : undefined} />
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t.settings.membersCanInvite}</p>
              <p className="text-xs text-muted-foreground">
                {t.settings.membersCanInviteDescription}
              </p>
            </div>
            <Switch
              checked={checked}
              onCheckedChange={handleChange}
              disabled={pending}
              data-testid="pool-settings-members-can-invite-switch"
              aria-label={t.settings.membersCanInvite}
            />
          </div>
        </>
      )}

      <Dialog open={confirmOpen} onOpenChange={(o) => !o && setConfirmOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.settings.renameConfirmTitle}</DialogTitle>
            <DialogDescription>
              {t.settings.renameConfirmBody}{" "}
              <span className="text-foreground">
                «{name}» → «{trimmedDraft}»
              </span>
            </DialogDescription>
          </DialogHeader>

          <FormError messages={renameError ? [renameError] : undefined} />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={renamePending}
            >
              {t.settings.renameCancel}
            </Button>
            <Button
              onClick={handleRenameConfirm}
              disabled={renamePending}
              data-testid="pool-settings-rename-confirm"
            >
              {t.settings.renameConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
