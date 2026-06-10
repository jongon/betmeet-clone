import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Set new password" };

export default function ResetPasswordPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Set a new password</h2>
        <p className="text-sm text-muted-foreground">Choose a strong password for your account.</p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
