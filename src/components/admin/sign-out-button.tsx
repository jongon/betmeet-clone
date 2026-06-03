"use client";

import { LogOutIcon } from "lucide-react";
import { useTransition } from "react";
import { signOut } from "@/app/admin/auth-actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(() => {
      void signOut();
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={isPending}
      aria-label="Cerrar sesión"
    >
      <LogOutIcon />
      {isPending ? "Cerrando…" : "Cerrar sesión"}
    </Button>
  );
}
