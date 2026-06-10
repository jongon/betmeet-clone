import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Forgot your password?</h2>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send a reset link.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
