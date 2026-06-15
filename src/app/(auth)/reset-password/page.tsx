import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getRequestLocale());
  return { title: dictionary.auth.resetTitle };
}

export default async function ResetPasswordPage() {
  const dictionary = getDictionary(await getRequestLocale());

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{dictionary.auth.resetTitle}</h2>
        <p className="text-sm text-muted-foreground">{dictionary.auth.resetDescription}</p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
