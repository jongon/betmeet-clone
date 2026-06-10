import type { Metadata } from "next";
import { Separator } from "@/components/ui/separator";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <div className="space-y-4">
      <GoogleSignInButton />

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <SignUpForm />
    </div>
  );
}
