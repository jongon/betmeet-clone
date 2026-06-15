"use client";

import { useEffect, useState } from "react";
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
import { loadOwnedPoolsForDeletion } from "@/features/pools/actions/load-owned-pools-for-deletion";
import type { OwnedPoolTransfer } from "@/features/pools/types";
import { useDictionary } from "@/i18n/dictionary-provider";
import { deleteAccount } from "../actions/delete-account";

const CONFIRM_PHRASE = "delete my account";

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
}

export function ConfirmDeleteModal({ open, onClose }: ConfirmDeleteModalProps) {
  const t = useDictionary().auth;
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [ownedPools, setOwnedPools] = useState<OwnedPoolTransfer[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  // Load the pools the user administers so they can reassign ownership (BL-9).
  useEffect(() => {
    if (!open) return;
    loadOwnedPoolsForDeletion().then(setOwnedPools);
  }, [open]);

  const poolsNeedingOwner = ownedPools.filter((p) => p.candidates.length > 0);
  const poolsToDelete = ownedPools.filter((p) => p.candidates.length === 0);
  const allOwnersChosen = poolsNeedingOwner.every((p) => assignments[p.poolId]);

  const confirmed = phrase === CONFIRM_PHRASE && allOwnersChosen;

  async function handleDelete() {
    if (!confirmed) return;
    setPending(true);
    setError(null);
    const result = await deleteAccount(
      Object.entries(assignments).map(([poolId, newOwnerId]) => ({ poolId, newOwnerId })),
    );
    if (result?.error) {
      setError(result.error._form?.[0] ?? t.deleteFailed);
      setPending(false);
    }
    // On success, deleteAccount redirects
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.deleteTitle}</DialogTitle>
          <DialogDescription>
            {t.deleteDescription.split("**delete my account**")[0]}
            <strong>{CONFIRM_PHRASE}</strong>
            {t.deleteDescription.split("**delete my account**")[1]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormError messages={error ? [error] : undefined} />

          {poolsNeedingOwner.length > 0 && (
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium">{t.transferPools}</p>
              {poolsNeedingOwner.map((pool) => (
                <div key={pool.poolId} className="space-y-1">
                  <Label htmlFor={`transfer-${pool.poolId}`}>{pool.poolName}</Label>
                  <select
                    id={`transfer-${pool.poolId}`}
                    data-testid={`delete-account-pool-transfer-${pool.poolId}`}
                    className="h-9 w-full rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={assignments[pool.poolId] ?? ""}
                    onChange={(e) =>
                      setAssignments((prev) => ({ ...prev, [pool.poolId]: e.target.value }))
                    }
                  >
                    <option value="" disabled>
                      {t.transferPlaceholder}
                    </option>
                    {pool.candidates.map((c) => (
                      <option key={c.userId} value={c.userId}>
                        {c.nickname}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {poolsToDelete.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {t.poolsToDelete} {poolsToDelete.map((p) => p.poolName).join(", ")}.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="confirm-phrase">{t.deleteConfirmation}</Label>
            <Input
              id="confirm-phrase"
              type="text"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={CONFIRM_PHRASE}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {t.cancel}
          </Button>
          <Button variant="destructive" disabled={!confirmed || pending} onClick={handleDelete}>
            {pending ? t.deleting : t.deleteTitle}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
