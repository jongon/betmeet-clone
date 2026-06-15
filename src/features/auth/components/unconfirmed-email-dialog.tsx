"use client";

import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/i18n/dictionary-provider";
import { changeUnconfirmedEmail } from "../actions/change-unconfirmed-email";

type ActionState = Awaited<ReturnType<typeof changeUnconfirmedEmail>>;

interface UnconfirmedEmailDialogProps {
  email: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Lets a user with an unconfirmed account change its email while keeping the same
 * account (FR-REFINE-12.3). Opened from the sign-in unconfirmed-email panel.
 */
export function UnconfirmedEmailDialog({ email, open, onClose }: UnconfirmedEmailDialogProps) {
  const t = useDictionary().auth;
  const [state, action, pending] = useActionState<ActionState | undefined, FormData>(
    async (_prev, formData) => changeUnconfirmedEmail(formData),
    undefined,
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.changeEmailTitle}</DialogTitle>
          <DialogDescription>{t.changeEmailDescription}</DialogDescription>
        </DialogHeader>

        {state?.success ? (
          <p className="text-sm text-muted-foreground">{t.changeSuccess}</p>
        ) : (
          <form action={action} className="space-y-4" noValidate>
            <FormError messages={state?.error?._form} />
            {state?.retryAfterSeconds ? <FormError messages={[t.cooldown]} /> : null}

            <div className="space-y-1.5">
              <Label htmlFor="currentEmail">{t.currentEmail}</Label>
              <Input
                id="currentEmail"
                name="currentEmail"
                type="email"
                autoComplete="email"
                defaultValue={email}
                required
                aria-describedby={state?.error?.currentEmail ? "currentEmail-error" : undefined}
              />
              <FormError id="currentEmail-error" messages={state?.error?.currentEmail} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unconfirmed-password">{t.password}</Label>
              <Input
                id="unconfirmed-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                aria-describedby={state?.error?.password ? "password-error" : undefined}
              />
              <FormError id="password-error" messages={state?.error?.password} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newEmail">{t.newEmail}</Label>
              <Input
                id="newEmail"
                name="newEmail"
                type="email"
                autoComplete="email"
                required
                aria-describedby={state?.error?.newEmail ? "newEmail-error" : undefined}
              />
              <FormError id="newEmail-error" messages={state?.error?.newEmail} />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                {t.cancel}
              </Button>
              <Button type="submit" className="flex-1" disabled={pending}>
                {pending ? t.submitting : t.submit}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
