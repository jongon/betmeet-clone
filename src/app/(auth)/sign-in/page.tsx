import type { Metadata } from "next";
import { Separator } from "@/components/ui/separator";
import { AuthLinkErrorMessage } from "@/features/auth/components/auth-link-error-message";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { PasskeySignInButton } from "@/features/auth/components/passkey-sign-in-button";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

interface Props {
  searchParams: Promise<{
    reset?: string;
    deleted?: string;
    next?: string;
    error?: string;
    confirmed?: string;
  }>;
}

export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = params.next;

  return (
    <div className="space-y-4">
      {params.confirmed === "1" && (
        <div role="status" className="rounded-md bg-muted px-3 py-2 text-sm text-center">
          Tu correo fue confirmado. Inicia sesión para continuar.
        </div>
      )}
      {params.reset === "success" && (
        <div role="status" className="rounded-md bg-muted px-3 py-2 text-sm text-center">
          Password reset successfully. Sign in with your new password.
        </div>
      )}
      {params.deleted === "true" && (
        <div role="status" className="rounded-md bg-muted px-3 py-2 text-sm text-center">
          Your account has been deleted.
        </div>
      )}
      <AuthLinkErrorMessage error={params.error} />

      <GoogleSignInButton next={next} />
      <PasskeySignInButton next={next} />

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <SignInForm next={next} />
    </div>
  );
}
