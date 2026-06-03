"use client";

import { type ReactNode, useState, useTransition } from "react";
import { acceptSession } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AcceptDialog({
  sessionId,
  cambiadorName,
  children,
}: {
  sessionId: string;
  cambiadorName: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      await acceptSession(sessionId);
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Aceptar la sesión de {cambiadorName}?</DialogTitle>
          <DialogDescription>
            Al confirmar, te comprometes a coordinar el intercambio. La sesión se marcará como
            cerrada y no podrá volver a abrirse.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton={false}>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
          <Button type="button" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Aceptando…" : "Sí, aceptar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
