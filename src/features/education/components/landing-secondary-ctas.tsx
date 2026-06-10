import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { es } from "@/i18n/dictionaries/es";
import { cn } from "@/lib/utils";

export function LandingSecondaryCtas() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Link
        href="/sign-in"
        className={cn(buttonVariants({ variant: "outline" }))}
        data-testid="landing-sign-in"
      >
        {es.common.signIn}
      </Link>
      <Link
        href="/sign-up"
        className={cn(buttonVariants({ variant: "ghost" }))}
        data-testid="landing-explore-pools"
      >
        {es.landing.explorePools}
      </Link>
    </div>
  );
}
