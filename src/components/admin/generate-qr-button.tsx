"use client";

import { QrCodeIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { type GeneratedQr, generateQr } from "@/app/admin/qr-actions";
import { QrDialog } from "@/components/admin/qr-dialog";
import { Button } from "@/components/ui/button";

export function GenerateQrButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedQr | null>(null);
  const [open, setOpen] = useState(false);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateQr();
        setGenerated(result);
        setOpen(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo generar el QR");
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={onClick}
        disabled={isPending}
        aria-label="Generar QR"
      >
        <QrCodeIcon />
        {isPending ? "Generando…" : "Generar QR"}
      </Button>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {generated ? (
        <QrDialog
          open={open}
          onOpenChange={setOpen}
          title="Tu QR para intercambiar"
          description="Muéstrale este código a un cambiador o comparte la URL. Alguien lo escaneará, escribirá su nombre y se creará una sesión de cambio."
          token={generated.token}
          url={generated.url}
          dataUrl={generated.dataUrl}
          createdAt={generated.createdAt}
        />
      ) : null}
    </>
  );
}
