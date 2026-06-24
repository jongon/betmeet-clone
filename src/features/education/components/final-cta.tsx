import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

/**
 * Closing call-to-action band that nudges the visitor to sign up (BR-67.6).
 * Server component; copy from the dictionary, CTA targets the existing
 * public `/sign-up` route.
 */
export async function FinalCta() {
  const dictionary = getDictionary(await getRequestLocale());
  const { finalCta } = dictionary.landing;

  return (
    <section>
      <Card className="bg-brand/10 ring-brand/20">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <h2 className="max-w-2xl text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            {finalCta.title}
          </h2>
          <p className="max-w-xl text-balance text-muted-foreground">{finalCta.subtitle}</p>
          <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }))}>
            {finalCta.cta}
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
