"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "../actions/sign-up";

type ActionState = Awaited<ReturnType<typeof signUp>>;

export function SignUpForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => signUp(formData),
    undefined,
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError messages={state?.error?._form as string[] | undefined} />

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-describedby={state?.error?.email ? "email-error" : undefined}
        />
        <FormError id="email-error" messages={state?.error?.email as string[] | undefined} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-describedby={state?.error?.password ? "password-error" : undefined}
        />
        <FormError id="password-error" messages={state?.error?.password as string[] | undefined} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-describedby={state?.error?.confirmPassword ? "confirm-error" : undefined}
        />
        <FormError
          id="confirm-error"
          messages={state?.error?.confirmPassword as string[] | undefined}
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="underline underline-offset-4 hover:text-foreground">
          Sign in
        </Link>
      </p>
    </form>
  );
}
