"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/i18n/dictionary-provider";
import { getMfaFactors } from "../actions/mfa-verify";
import { resendConfirmation } from "../actions/resend-confirmation";
import { signIn } from "../actions/sign-in";
import { type SignInInput, SignInSchema } from "../schemas";
import { MFAPromptModal } from "./mfa-prompt-modal";
import { UnconfirmedEmailDialog } from "./unconfirmed-email-dialog";

type ActionState = Awaited<ReturnType<typeof signIn>>;

export function SignInForm({ next }: { next?: string }) {
  const t = useDictionary().auth;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => signIn(formData),
    undefined,
  );
  // Client-side validation (FR-REFINE-15.11): email format + password rule are
  // checked before the request via the shared SignInSchema; the server action
  // still re-validates and owns auth errors (bad credentials, MFA, unconfirmed).
  // SignInSchema gives `rememberMe` a default, so its input type (optional) and
  // output type (required) differ — parametrise useForm with both.
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof SignInSchema>, unknown, SignInInput>({
    resolver: zodResolver(SignInSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "", rememberMe: false },
  });
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);
  const [resendState, resendAction, resendPending] = useActionState<
    Awaited<ReturnType<typeof resendConfirmation>> | undefined,
    FormData
  >(async (_prev, formData) => resendConfirmation(formData), undefined);

  // When server returns requiresMfa, load factors and open the MFA modal. Runs in
  // an effect (not during render) so it fires once per requiresMfa transition and
  // is safe under concurrent renders.
  useEffect(() => {
    if (!state?.requiresMfa) return;

    let cancelled = false;
    getMfaFactors().then(({ factors }) => {
      if (!cancelled && factors[0]) setMfaFactorId(factors[0].id);
    });

    return () => {
      cancelled = true;
    };
  }, [state?.requiresMfa]);

  const onValid = handleSubmit((data) => {
    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);
    if (data.rememberMe) formData.set("rememberMe", "true");
    if (next) formData.set("next", next);
    // useActionState's dispatch must run inside a transition; otherwise `pending`
    // never updates and the server action's redirect() doesn't propagate (the
    // session is set silently but the browser never navigates).
    startTransition(() => formAction(formData));
  });

  const emailErrors = errors.email?.message
    ? [errors.email.message]
    : (state?.error?.email as string[] | undefined);
  const passwordErrors = errors.password?.message
    ? [errors.password.message]
    : (state?.error?.password as string[] | undefined);

  const unconfirmedEmail = state?.unconfirmedEmail;

  return (
    <>
      <form onSubmit={onValid} className="space-y-4" noValidate>
        <FormError messages={state?.error?._form as string[] | undefined} />

        <div className="space-y-1.5">
          <Label htmlFor="email">{t.email}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={emailErrors ? true : undefined}
            aria-describedby={emailErrors ? "email-error" : undefined}
            {...register("email")}
          />
          <FormError id="email-error" messages={emailErrors} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t.password}</Label>
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {t.forgotPassword}
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={passwordErrors ? true : undefined}
            aria-describedby={passwordErrors ? "password-error" : undefined}
            {...register("password")}
          />
          <FormError id="password-error" messages={passwordErrors} />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="rememberMe"
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            {...register("rememberMe")}
          />
          <Label htmlFor="rememberMe" className="text-sm font-normal">
            {t.rememberMe}
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t.signingIn : t.signInSubmit}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t.noAccount}{" "}
          <Link href="/sign-up" className="underline underline-offset-4 hover:text-foreground">
            {t.signUpSubmit}
          </Link>
        </p>
      </form>

      {unconfirmedEmail && (
        <div
          role="status"
          className="mt-4 space-y-3 rounded-md border border-border bg-muted/40 p-4"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium">{t.unconfirmedTitle}</p>
            <p className="text-sm text-muted-foreground">{t.unconfirmedDescription}</p>
          </div>

          {resendState?.success ? (
            <p className="text-sm text-muted-foreground">{t.resendSuccess}</p>
          ) : null}
          {resendState?.retryAfterSeconds ? <FormError messages={[t.cooldown]} /> : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <form action={resendAction} className="flex-1">
              <input type="hidden" name="email" value={unconfirmedEmail} />
              <Button type="submit" variant="outline" className="w-full" disabled={resendPending}>
                {resendPending ? t.resending : t.resend}
              </Button>
            </form>
            <Button type="button" className="flex-1" onClick={() => setChangeEmailOpen(true)}>
              {t.changeEmail}
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
