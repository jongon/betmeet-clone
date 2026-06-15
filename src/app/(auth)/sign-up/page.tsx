import type { Metadata } from "next";
import { Separator } from "@/components/ui/separator";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getRequestLocale());
  return { title: dictionary.auth.signUpTitle };
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const dictionary = getDictionary(await getRequestLocale());

  return (
    <div className="space-y-4">
      <GoogleSignInButton next={next} />

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">{dictionary.common.or}</span>
        <Separator className="flex-1" />
      </div>

      <SignUpForm next={next} />
    </div>
  );
}
