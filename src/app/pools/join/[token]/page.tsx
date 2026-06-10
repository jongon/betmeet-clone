import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { JoinConfirm } from "@/features/pools/components/join-confirm";

interface JoinPoolPageProps {
  params: Promise<{ token: string }>;
}

export default async function JoinPoolPage({ params }: JoinPoolPageProps) {
  const { token } = await params;

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <Link className={buttonVariants({ variant: "ghost" })} href="/pools">
        Volver
      </Link>
      <header>
        <p className="text-sm font-medium text-primary">Invitación</p>
        <h1 className="text-3xl font-semibold tracking-tight">Unirse a un pool</h1>
        <p className="text-muted-foreground">Confirma el código compartido antes de entrar.</p>
      </header>
      <JoinConfirm token={token} />
    </main>
  );
}
