"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMfaFactors } from "../actions/mfa-verify";
import { signIn } from "../actions/sign-in";
import { MFAPromptModal } from "./mfa-prompt-modal";

type ActionState = Awaited<ReturnType<typeof signIn>>;

export function SignInForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => signIn(formData),
    undefined,
  );
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  // When server returns requiresMfa, load factors and open modal
  if (state?.requiresMfa && !mfaFactorId) {
    getMfaFactors().then(({ factors }) => {
      if (factors[0]) setMfaFactorId(factors[0].id);
    });
  }

  return (
    <>
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-describedby={state?.error?.password ? "password-error" : undefined}
          />
          <FormError
            id="password-error"
            messages={state?.error?.password as string[] | undefined}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="rememberMe"
            name="rememberMe"
            type="checkbox"
            value="true"
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="rememberMe" className="text-sm font-normal">
            Remember me for 30 days
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="underline underline-offset-4 hover:text-foreground">
            Sign up
          </Link>
        </p>
      </form>

      {mfaFactorId && (
        <MFAPromptModal
          factorId={mfaFactorId}
          open={!!mfaFactorId}
          onClose={() => setMfaFactorId(null)}
        />
      )}
    </>
  );
}
