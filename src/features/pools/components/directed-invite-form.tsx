"use client";

import { useState, useTransition } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDirectedInvite } from "../actions/create-directed-invite";

export function DirectedInviteForm({ poolId }: { poolId: string }) {
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await createDirectedInvite({ poolId, target });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setTarget("");
      setMessage(
        result?.pushQueued
          ? "Invitación enviada con push."
          : "Invitación guardada. El link sigue disponible.",
      );
    });
  }

  return (
    <div className="space-y-3 rounded-xl border p-4" data-testid="directed-invite-form">
      <div>
        <p className="font-medium">Invitar por nickname o email</p>
        <p className="text-sm text-muted-foreground">
          El link actual se mantiene. Si el usuario existe y activó push, recibirá aviso.
        </p>
      </div>
      <FormError messages={error ? [error] : undefined} />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <div className="flex gap-2">
        <Input
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          placeholder="Messi10#4921 o email@dominio.com"
          aria-label="Nickname o email"
        />
        <Button type="button" disabled={pending || target.trim().length < 3} onClick={submit}>
          Invitar
        </Button>
      </div>
    </div>
  );
}
