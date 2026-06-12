"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { es } from "@/i18n/dictionaries/es";
import { getMfaFactors } from "../actions/mfa-verify";
import { resendConfirmation } from "../actions/resend-confirmation";
import { signIn } from "../actions/sign-in";
import { MFAPromptModal } from "./mfa-prompt-modal";
import { UnconfirmedEmailDialog } from "./unconfirmed-email-dialog";

type ActionState = Awaited<ReturnType<typeof signIn>>;

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => signIn(formData),
    undefined,
  );
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);
  const [resendState, resendAction, resendPending] = useActionState<
    Awaited<ReturnType<typeof resendConfirmation>> | undefined,
    FormData
  >(async (_prev, formData) => resendConfirmation(formData), undefined);

  // When server returns requiresMfa, load factors and open modal
  if (state?.requiresMfa && !mfaFactorId) {
    getMfaFactors().then(({ factors }) => {
      if (factors[0]) setMfaFactorId(factors[0].id);
    });
  }

  const unconfirmedEmail = state?.unconfirmedEmail;

  return (
    <>
      <form action={action} className="space-y-4" noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}
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

      {unconfirmedEmail && (
        <div
          role="status"
          className="mt-4 space-y-3 rounded-md border border-border bg-muted/40 p-4"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium">{es.auth.unconfirmedTitle}</p>
            <p className="text-sm text-muted-foreground">{es.auth.unconfirmedDescription}</p>
          </div>

          {resendState?.success ? (
            <p className="text-sm text-muted-foreground">{es.auth.resendSuccess}</p>
          ) : null}
          {resendState?.retryAfterSeconds ? <FormError messages={[es.auth.cooldown]} /> : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <form action={resendAction} className="flex-1">
              <input type="hidden" name="email" value={unconfirmedEmail} />
              <Button type="submit" variant="outline" className="w-full" disabled={resendPending}>
                {resendPending ? es.auth.resending : es.auth.resend}
              </Button>
            </form>
            <Button type="button" className="flex-1" onClick={() => setChangeEmailOpen(true)}>
              {es.auth.changeEmail}
            </Button>
          </div>
        </div>
      )}

      {unconfirmedEmail && (
        <UnconfirmedEmailDialog
          email={unconfirmedEmail}
          open={changeEmailOpen}
          onClose={() => setChangeEmailOpen(false)}
        />
      )}

      {mfaFactorId && (
        <MFAPromptModal
          factorId={mfaFactorId}
          open={!!mfaFactorId}
          next={state?.next}
          onClose={() => setMfaFactorId(null)}
        />
      )}
    </>
  );
}
