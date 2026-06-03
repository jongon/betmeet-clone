"use client";

import { EyeIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { type GeneratedQr, viewSessionQr } from "@/app/admin/qr-actions";
import { QrDialog } from "@/components/admin/qr-dialog";
import { Button } from "@/components/ui/button";

export function ViewSessionQrButton({
  token,
  cambiadorName,
  sessionCreatedAt,
}: {
  token: string;
  cambiadorName: string;
  sessionCreatedAt: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [generated, setGenerated] = useState<GeneratedQr | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await viewSessionQr(token, sessionCreatedAt);
        setGenerated(result);
        setOpen(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el QR");
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onClick}
        disabled={isPending}
        aria-label={`Ver QR de ${cambiadorName}`}
        className="text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <EyeIcon />
      </Button>
      {error ? (
        <span className="sr-only" role="alert">
          {error}
        </span>
      ) : null}
      {generated ? (
        <QrDialog
          open={open}
          onOpenChange={setOpen}
          title={`QR con el que ${cambiadorName} creó la sesión`}
          description="Comparte este QR con el cambiador para reanudar el intercambio."
          token={generated.token}
          url={generated.url}
          dataUrl={generated.dataUrl}
          createdAt={generated.createdAt}
        />
      ) : null}
    </>
  );
}
