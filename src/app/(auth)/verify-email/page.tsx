import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getRequestLocale());
  return { title: dictionary.auth.verifyEmailTitle };
}

export default async function VerifyEmailPage() {
  const dictionary = getDictionary(await getRequestLocale());

  return (
    <div className="space-y-4 text-center">
      <div className="text-4xl" aria-hidden="true">
        📬
      </div>
      <div>
        <h2 className="text-lg font-semibold">{dictionary.auth.verifyEmailHeading}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {dictionary.auth.verifyEmailDescription}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        {dictionary.auth.alreadyConfirmed}{" "}
        <Link href="/sign-in" className="underline underline-offset-4 hover:text-foreground">
          {dictionary.common.signIn}
        </Link>
      </p>
    </div>
  );
}
