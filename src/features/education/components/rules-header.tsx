"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useDictionary } from "@/i18n/dictionary-provider";
import { cn } from "@/lib/utils";

export function RulesHeader() {
  const { rules } = useDictionary();

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">{rules.centerTitle}</h1>
        <p className="text-sm text-muted-foreground">{rules.centerSubtitle}</p>
      </div>
      <Link href="/" className={cn(buttonVariants())} data-testid="rules-make-predictions">
        {rules.makePredictions}
      </Link>
    </header>
  );
}
