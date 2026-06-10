import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatePoolForm } from "@/features/pools/components/create-pool-form";

export default function NewPoolPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <Link className={buttonVariants({ variant: "ghost" })} href="/pools">
        Volver
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Crear pool</CardTitle>
        </CardHeader>
        <CardContent>
          <CreatePoolForm />
        </CardContent>
      </Card>
    </main>
  );
}
