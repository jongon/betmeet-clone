"use client";

import { useState, useTransition } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPool } from "../actions/create-pool";
import type { PoolType } from "../types";

export function CreatePoolForm() {
  const [name, setName] = useState("");
  const [type, setType] = useState<PoolType>("PUBLIC");
  const [capacity, setCapacity] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createPool({ name, type, capacity });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={submit} className="space-y-5" data-testid="create-pool-form">
      <FormError messages={error ? [error] : undefined} />

      <div className="space-y-2">
        <Label htmlFor="pool-name">Nombre</Label>
        <Input
          id="pool-name"
          name="name"
          minLength={3}
          maxLength={60}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="La quiniela de la oficina"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pool-type">Visibilidad</Label>
          <select
            id="pool-type"
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
            value={type}
            onChange={(event) => setType(event.target.value as PoolType)}
          >
            <option value="PUBLIC">Público</option>
            <option value="PRIVATE">Privado</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pool-capacity">Capacidad</Label>
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

      <Button type="submit" disabled={pending} data-testid="create-pool-submit">
        {pending ? "Creando..." : "Crear pool"}
      </Button>
    </form>
  );
}
