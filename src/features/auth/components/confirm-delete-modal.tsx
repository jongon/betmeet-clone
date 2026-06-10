"use client";

import { useState } from "react";
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
import { deleteAccount } from "../actions/delete-account";

const CONFIRM_PHRASE = "delete my account";

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
}

export function ConfirmDeleteModal({ open, onClose }: ConfirmDeleteModalProps) {
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const confirmed = phrase === CONFIRM_PHRASE;

  async function handleDelete() {
    if (!confirmed) return;
    setPending(true);
    const result = await deleteAccount();
    if (result?.error) {
      setError(result.error._form?.[0] ?? "Failed to delete account");
      setPending(false);
    }
    // On success, deleteAccount redirects
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete account</DialogTitle>
          <DialogDescription>
            This action is permanent and cannot be undone. Type <strong>{CONFIRM_PHRASE}</strong> to
            confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormError messages={error ? [error] : undefined} />

          <div className="space-y-1.5">
            <Label htmlFor="confirm-phrase">Confirmation</Label>
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
            Cancel
          </Button>
          <Button variant="destructive" disabled={!confirmed || pending} onClick={handleDelete}>
            {pending ? "Deleting…" : "Delete account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
