"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { labelStyles } from "@/components/ui/label";
import { createCambioSessionAction } from "./actions";
import { type CreateCambioSessionState, INITIAL_CREATE_STATE } from "./state";

type NameFormProps = {
  token: string;
};

export function NameForm({ token }: NameFormProps) {
  const [state, action, isPending] = useActionState<CreateCambioSessionState, FormData>(
    createCambioSessionAction,
    INITIAL_CREATE_STATE,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className={labelStyles()}>
          Tu nombre
        </label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Ej: Carlos"
          required
          minLength={2}
          maxLength={40}
          defaultValue={state.value}
          aria-invalid={state.fieldError ? true : undefined}
          aria-describedby={state.fieldError ? "name-error" : undefined}
        />
        {state.fieldError ? (
          <p id="name-error" className="text-xs text-destructive" role="alert">
            {state.fieldError}
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Ingresando..." : "Aceptar"}
      </Button>
    </form>
  );
}
