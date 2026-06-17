"use client";

import { Fingerprint } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/form-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDictionary } from "@/i18n/dictionary-provider";
import { createClient } from "@/lib/supabase/client";

interface PasskeyInfo {
  id: string;
  friendlyName: string;
  createdAt: string;
  lastUsedAt?: string | null;
}

interface PasskeyManagementCardProps {
  passkeys: PasskeyInfo[];
}

export function PasskeyManagementCard({ passkeys }: PasskeyManagementCardProps) {
  const t = useDictionary().settings;
  const [items, setItems] = useState<PasskeyInfo[]>(passkeys);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PasskeyInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleRegister() {
    setRegistering(true);
    setRegisterError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.registerPasskey();

      if (error) {
        setRegisterError(error.message);
      } else if (data) {
        setItems((prev) => [
          ...prev,
          {
            id: data.id,
            friendlyName: data.friendly_name ?? t.passkeyDefaultName,
            createdAt: data.created_at ?? new Date().toISOString(),
          },
        ]);
        toast.success(t.passkeyRegistered);
      }
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : t.passkeyDefaultName);
    }

    setRegistering(false);
  }

  async function handleDelete(passkey: PasskeyInfo) {
    setDeleting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.passkey.delete({
        passkeyId: passkey.id,
      });

      if (error) {
        toast.error(error.message);
      } else {
        setItems((prev) => prev.filter((p) => p.id !== passkey.id));
        toast.success(t.passkeyDeleted);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.passkeyDefaultName);
    }

    setDeleting(false);
    setDeleteTarget(null);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t.passkeyTitle}</CardTitle>
              <CardDescription>{t.passkeyDescription}</CardDescription>
            </div>
            <Badge variant={items.length > 0 ? "default" : "secondary"}>
              {items.length > 0
                ? t.passkeyCount.replace("{count}", String(items.length))
                : t.passkeyEmpty}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((passkey) => (
            <div
              key={passkey.id}
              className="flex items-center justify-between rounded-md border px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{passkey.friendlyName}</span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={() => setDeleteTarget(passkey)}
              >
                {t.passkeyDelete}
              </Button>
            </div>
          ))}

          <FormError messages={registerError ? [registerError] : undefined} />

          <Button variant="outline" disabled={registering} onClick={handleRegister}>
            {registering ? t.passkeyRegistering : t.passkeyRegister}
          </Button>
        </CardContent>
      </Card>

      <Dialog
        key={String(!!deleteTarget)}
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.passkeyDeleteTitle}</DialogTitle>
            <DialogDescription>{t.passkeyDeleteDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t.passkeyDelete}
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              {t.passkeyDelete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
