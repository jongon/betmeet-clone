"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "../actions/sign-up";
import { type SignUpInput, SignUpSchema } from "../schemas";

type ActionState = Awaited<ReturnType<typeof signUp>>;

export function SignUpForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => signUp(formData),
    undefined,
  );
  // Client-side validation (FR-REFINE-15.12): email format, password rule and
  // confirm-password match are checked before the request via the shared
  // SignUpSchema; the server action re-validates on submit.
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(SignUpSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onValid = handleSubmit((data) => {
    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);
    formData.set("confirmPassword", data.confirmPassword);
    if (next) formData.set("next", next);
    // useActionState's dispatch must run inside a transition; otherwise `pending`
    // never updates and the server action's redirect() doesn't propagate.
    startTransition(() => formAction(formData));
  });

  const emailErrors = errors.email?.message
    ? [errors.email.message]
    : (state?.error?.email as string[] | undefined);
  const passwordErrors = errors.password?.message
    ? [errors.password.message]
    : (state?.error?.password as string[] | undefined);
  const confirmErrors = errors.confirmPassword?.message
    ? [errors.confirmPassword.message]
    : (state?.error?.confirmPassword as string[] | undefined);

  return (
    <form onSubmit={onValid} className="space-y-4" noValidate>
      <FormError messages={state?.error?._form as string[] | undefined} />

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
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
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={passwordErrors ? true : undefined}
          aria-describedby={passwordErrors ? "password-error" : undefined}
          {...register("password")}
        />
        <FormError id="password-error" messages={passwordErrors} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={confirmErrors ? true : undefined}
          aria-describedby={confirmErrors ? "confirm-error" : undefined}
          {...register("confirmPassword")}
        />
        <FormError id="confirm-error" messages={confirmErrors} />
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
