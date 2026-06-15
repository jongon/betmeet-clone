"use client";

import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/i18n/dictionary-provider";
import { resetPassword } from "../actions/reset-password";

type ActionState = Awaited<ReturnType<typeof resetPassword>>;

export function ResetPasswordForm() {
  const t = useDictionary().auth;
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => resetPassword(formData),
    undefined,
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError messages={state?.error?._form as string[] | undefined} />

      <div className="space-y-1.5">
        <Label htmlFor="password">{t.newPassword}</Label>
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
        <Label htmlFor="confirmPassword">{t.confirmNewPassword}</Label>
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
        {pending ? t.resetting : t.resetSubmit}
      </Button>
    </form>
  );
}
