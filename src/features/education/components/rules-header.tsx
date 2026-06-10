import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { es } from "@/i18n/dictionaries/es";
import { cn } from "@/lib/utils";

export function RulesHeader() {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">{es.rules.centerTitle}</h1>
        <p className="text-sm text-muted-foreground">{es.rules.centerSubtitle}</p>
      </div>
      <Link href="/" className={cn(buttonVariants())} data-testid="rules-make-predictions">
        {es.rules.makePredictions}
      </Link>
    </header>
  );
}
