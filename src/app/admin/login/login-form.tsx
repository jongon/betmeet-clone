"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { labelStyles } from "@/components/ui/label";
import { type SignInState, signIn } from "./actions";

const INITIAL: SignInState = { error: null };

type LoginFormProps = { next: string };

export function LoginForm({ next }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(signIn, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={labelStyles()}>
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="admin@ejemplo.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={labelStyles()}>
          Contraseña
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
        />
      </div>

      <label
        htmlFor="remember"
        className="text-muted-foreground flex cursor-pointer items-center gap-2 text-sm"
      >
        <input
          id="remember"
          name="remember"
          type="checkbox"
          className="text-primary focus:ring-ring/50 size-4 rounded border-input bg-background shadow-xs checked:border-primary focus:ring-[3px] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span>Recordar mi sesión</span>
      </label>

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
