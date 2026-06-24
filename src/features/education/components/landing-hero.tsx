"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useDictionary } from "@/i18n/dictionary-provider";
import { cn } from "@/lib/utils";

export function LandingHero() {
  const { landing } = useDictionary();

  return (
    <section className="flex flex-col items-center gap-6 py-12 text-center sm:py-20">
      <span className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">
        <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
        {landing.heroEyebrow}
      </span>
      <h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
        {landing.heroTitle}
      </h1>
      <p className="max-w-xl text-balance text-muted-foreground sm:text-lg">
        {landing.heroSubtitle}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/sign-up"
          className={cn(buttonVariants({ size: "lg" }))}
          data-testid="landing-primary-cta"
        >
          {landing.primaryCta}
        </Link>
        <Link
          href="#how-it-works"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          {landing.heroSecondaryCta}
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">{landing.heroTagline}</p>
    </section>
  );
}
