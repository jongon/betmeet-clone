"use client";

import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDictionary } from "@/i18n/dictionary-provider";

export function InviteShare({ token }: { token: string }) {
  const t = useDictionary().pools;
  const [copied, setCopied] = useState(false);
  const path = `/pools/join/${token}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${t.whatsappText} ${path}`)}`;

  function absoluteLink() {
    return `${window.location.origin}${path}`;
  }

  async function copy() {
    await navigator.clipboard.writeText(absoluteLink());
    setCopied(true);
  }

  return (
    <div className="space-y-3 rounded-xl border p-4" data-testid="invite-share">
      <div>
        <p className="font-medium">{t.invitationTitle}</p>
        <p className="text-sm text-muted-foreground">
          {t.inviteCode} {token}
        </p>
      </div>
      <Input readOnly value={path} aria-label={t.inviteLink} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={copy}>
          {copied ? t.copied : t.copyLink}
        </Button>
        <a
          className={buttonVariants({ variant: "outline" })}
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
        >
          {t.whatsapp}
        </a>
      </div>
    </div>
  );
}
