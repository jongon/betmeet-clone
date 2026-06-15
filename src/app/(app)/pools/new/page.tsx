import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatePoolForm } from "@/features/pools/components/create-pool-form";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

export default async function NewPoolPage() {
  const dictionary = getDictionary(await getRequestLocale());

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <Link className={buttonVariants({ variant: "ghost" })} href="/pools">
        {dictionary.pools.back}
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{dictionary.pools.create}</CardTitle>
        </CardHeader>
        <CardContent>
          <CreatePoolForm />
        </CardContent>
      </Card>
    </main>
  );
}
