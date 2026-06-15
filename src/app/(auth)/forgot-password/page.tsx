import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getRequestLocale());
  return { title: dictionary.auth.forgotTitle };
}

export default async function ForgotPasswordPage() {
  const dictionary = getDictionary(await getRequestLocale());

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{dictionary.auth.forgotTitle}</h2>
        <p className="text-sm text-muted-foreground">{dictionary.auth.forgotDescription}</p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
