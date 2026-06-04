"use client";

import { EyeIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { type GeneratedQr, viewSessionQr } from "@/app/admin/qr-actions";
import { QrDialog } from "@/components/admin/qr-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
      const result = await viewSessionQr({ token, fallbackCreatedAt: sessionCreatedAt });
      if (result.ok) {
        setGenerated(result.qr);
        setOpen(true);
      } else {
        setError(result.error);
        setOpen(true);
      }
    });
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClick}
              disabled={isPending}
              aria-label={`Ver QR de ${cambiadorName}`}
              className="text-muted-foreground hover:bg-muted hover:text-foreground"
            />
          }
        >
          <EyeIcon />
        </TooltipTrigger>
        <TooltipContent>{`Ver QR de ${cambiadorName}`}</TooltipContent>
      </Tooltip>
      <QrDialog
        open={open}
        onOpenChange={setOpen}
        title={`QR con el que ${cambiadorName} creó la sesión`}
        description={
          error ? undefined : "Comparte este QR con el cambiador para reanudar el intercambio."
        }
        token={generated?.token ?? token}
        url={
          generated?.url ??
          `${typeof window !== "undefined" ? window.location.origin : ""}/cambio/${token}`
        }
        dataUrl={generated?.dataUrl ?? null}
        createdAt={generated?.createdAt ?? sessionCreatedAt}
        error={error}
      />
    </>
  );
}
