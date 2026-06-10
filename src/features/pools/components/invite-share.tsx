"use client";

import { useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InviteShare({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const link = useMemo(() => {
    if (typeof window === "undefined") return `/pools/join/${token}`;
    return `${window.location.origin}/pools/join/${token}`;
  }, [token]);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Únete a mi pool de quiniela: ${link}`)}`;

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  return (
    <div className="space-y-3 rounded-xl border p-4" data-testid="invite-share">
      <div>
        <p className="font-medium">Invitación</p>
        <p className="text-sm text-muted-foreground">Código: {token}</p>
      </div>
      <Input readOnly value={link} aria-label="Link de invitación" />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={copy}>
          {copied ? "Copiado" : "Copiar link"}
        </Button>
        <a
          className={buttonVariants({ variant: "outline" })}
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
        >
          Compartir por WhatsApp
        </a>
      </div>
    </div>
  );
}
