"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/i18n/dictionary-provider";
import { forgotPassword } from "../actions/forgot-password";

type ActionState = Awaited<ReturnType<typeof forgotPassword>>;

export function ForgotPasswordForm() {
  const t = useDictionary().auth;
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => forgotPassword(formData),
    undefined,
  );

  if (state?.success) {
    return (
      <div role="status" className="rounded-md bg-muted px-4 py-6 text-center text-sm">
        <p className="font-medium">{t.checkEmailTitle}</p>
        <p className="mt-1 text-muted-foreground">{t.checkEmailDescription}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t.email}</Label>
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

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t.sending : t.forgotSubmit}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/sign-in" className="underline underline-offset-4 hover:text-foreground">
          {t.backToSignIn}
        </Link>
      </p>
    </form>
  );
}
