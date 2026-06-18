import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { JoinConfirm } from "@/features/pools/components/join-confirm";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

interface JoinPoolPageProps {
  params: Promise<{ token: string }>;
}

export default async function JoinPoolPage({ params }: JoinPoolPageProps) {
  const dictionary = getDictionary(await getRequestLocale());
  const { token } = await params;

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <Link className={buttonVariants({ variant: "ghost" })} href="/pools">
        {dictionary.pools.back}
      </Link>
      <header>
        <p className="text-sm font-medium text-primary">{dictionary.pools.invitationTitle}</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {dictionary.pools.joinInviteTitle}
        </h1>
        <p className="text-muted-foreground">{dictionary.pools.joinInviteDescription}</p>
      </header>
      <JoinConfirm token={token} />
    </main>
  );
}
