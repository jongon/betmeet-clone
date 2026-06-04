"use client";

/* eslint-disable @next/next/no-img-element -- QR is a data URL from a server action; no next/image needed */

import { ClipboardCheckIcon, ClipboardIcon, XIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const dateFormatter = new Intl.DateTimeFormat("es", {
  dateStyle: "short",
  timeStyle: "short",
});

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  if (typeof document === "undefined") return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export function QrDialog({
  open,
  onOpenChange,
  title,
  description,
  token,
  url,
  dataUrl,
  createdAt,
  footer,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  token: string;
  url: string;
  dataUrl: string | null;
  createdAt: string;
  footer?: ReactNode;
  error?: string | null;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const onCopy = async () => {
    const ok = await copyToClipboard(url);
    setCopyState(ok ? "copied" : "error");
    window.setTimeout(() => setCopyState("idle"), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {error ? (
          <div
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        ) : dataUrl ? (
          <div className="flex flex-col items-center gap-3">
            {/* biome-ignore lint/performance/noImgElement: QR is a data URL from a server action; no next/image needed */}
            <img
              src={dataUrl}
              alt={`QR ${token}`}
              width={256}
              height={256}
              className="rounded-lg border border-border bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Creado el {dateFormatter.format(new Date(createdAt))}
            </p>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Generando QR…
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="qr-url">URL para compartir</Label>
          <div className="flex gap-2">
            <Input id="qr-url" readOnly value={url} onClick={(e) => e.currentTarget.select()} />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onCopy}
              aria-label="Copiar URL"
            >
              {copyState === "copied" ? (
                <ClipboardCheckIcon />
              ) : (
                <ClipboardIcon className={copyState === "error" ? "text-destructive" : undefined} />
              )}
            </Button>
          </div>
          {copyState === "copied" ? (
            <p className="text-xs text-muted-foreground" role="status">
              Copiado al portapapeles
            </p>
          ) : copyState === "error" ? (
            <p className="text-xs text-destructive" role="status">
              No se pudo copiar
            </p>
          ) : null}
        </div>

        <DialogFooter showCloseButton={false}>
          {footer ?? (
            <DialogClose render={<Button type="button" variant="outline" />}>
              <XIcon />
              Cerrar
            </DialogClose>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
