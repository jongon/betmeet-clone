import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

type SearchParams = Promise<{ next?: string | string[] }>;

function pickNext(value: string | string[] | undefined): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
    // The root path is no longer a valid landing page — send the user
    // straight to the admin dashboard instead.
    if (value === "/") return "/admin";
    return value;
  }
  return "/admin";
}

export default async function AdminLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const params = await searchParams;
    redirect(pickNext(params.next));
  }

  const params = await searchParams;
  const next = pickNext(params.next);

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-display text-xl tracking-tight">Acceso admin</CardTitle>
          <CardDescription>Inicia sesión con tu cuenta de coleccionista.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={next} />
        </CardContent>
      </Card>
    </main>
  );
}
