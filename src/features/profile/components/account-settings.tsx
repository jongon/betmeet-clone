"use client";

import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeEmail } from "@/features/auth/actions/change-email";
import { es } from "@/i18n/dictionaries/es";
import { setNickname } from "../actions/set-nickname";

type NicknameState = Awaited<ReturnType<typeof setNickname>> | undefined;
type EmailState = Awaited<ReturnType<typeof changeEmail>> | undefined;

interface AccountSettingsProps {
  currentNicknameBase: string;
  currentEmail: string;
}

/**
 * Profile account controls: change nickname (rate-limited) and email
 * (FR-REFINE-12.4 / 12.5). Both reuse existing server actions.
 */
export function AccountSettings({ currentNicknameBase, currentEmail }: AccountSettingsProps) {
  const t = es.profile;

  const [nickState, nickAction, nickPending] = useActionState<NicknameState, FormData>(
    async (_prev, formData) => setNickname(formData),
    undefined,
  );
  const [emailState, emailAction, emailPending] = useActionState<EmailState, FormData>(
    async (_prev, formData) => changeEmail(formData),
    undefined,
  );

  const nickError =
    nickState && "error" in nickState && nickState.error
      ? nickState.error === "rate_limited"
        ? t.nicknameRateLimited
        : nickState.error
      : undefined;

  const emailErr = emailState?.error;
  const emailFormError = emailErr && "_form" in emailErr ? emailErr._form : undefined;
  const emailFieldError = emailErr && "newEmail" in emailErr ? emailErr.newEmail : undefined;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="font-medium">{t.nicknameSection}</h3>
          <p className="text-sm text-muted-foreground">{t.nicknameDescription}</p>
        </div>
        <form action={nickAction} className="space-y-3" noValidate>
          {nickError ? <FormError messages={[nickError]} /> : null}
          {nickState && "success" in nickState && nickState.success ? (
            <p className="text-sm text-muted-foreground">{t.nicknameSuccess}</p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="nicknameBase">{t.nicknameLabel}</Label>
            <Input
              id="nicknameBase"
              name="nicknameBase"
              defaultValue={currentNicknameBase}
              autoComplete="off"
              required
            />
          </div>
          <Button type="submit" disabled={nickPending}>
            {t.nicknameSave}
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="font-medium">{t.emailSection}</h3>
          <p className="text-sm text-muted-foreground">{t.emailDescription}</p>
        </div>
        <form action={emailAction} className="space-y-3" noValidate>
          <FormError messages={emailFormError} />
          {emailState?.success ? (
            <p className="text-sm text-muted-foreground">{t.emailSuccess}</p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="currentEmail">{t.emailCurrentLabel}</Label>
            <Input
              id="currentEmail"
              name="currentEmail"
              type="email"
              value={currentEmail}
              readOnly
              disabled
              autoComplete="email"
              className="text-muted-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newEmail">{t.emailLabel}</Label>
            <Input
              id="newEmail"
              name="newEmail"
              type="email"
              autoComplete="email"
              required
              aria-describedby={emailFieldError ? "profile-newEmail-error" : undefined}
            />
            <FormError id="profile-newEmail-error" messages={emailFieldError} />
          </div>
          <Button type="submit" disabled={emailPending}>
            {t.emailSave}
          </Button>
        </form>
      </section>
    </div>
  );
}
