import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Verify your email" };

export default function VerifyEmailPage() {
  return (
    <div className="space-y-4 text-center">
      <div className="text-4xl" aria-hidden="true">
        📬
      </div>
      <div>
        <h2 className="text-lg font-semibold">Check your inbox</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We sent a confirmation link to your email. Click it to activate your account.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Already confirmed?{" "}
        <Link href="/sign-in" className="underline underline-offset-4 hover:text-foreground">
          Sign in
        </Link>
      </p>
    </div>
  );
}
