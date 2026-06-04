"use server";

import { revalidatePath } from "next/cache";
import { toDataURL } from "qrcode";
import { z } from "zod";
import { generateToken, revokeToken } from "@/lib/qr-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type GeneratedQr = {
  token: string;
  dataUrl: string;
  url: string;
  createdAt: string;
};

const TokenStringSchema = z.string().regex(/^qr_[0-9a-f]{32}$/);

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function generateQr(): Promise<GeneratedQr> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    throw new Error("No authenticated admin");
  }

  const created = await generateToken(user.email);
  const url = `${getBaseUrl()}/cambio/${created.token}`;
  const dataUrl = await toDataURL(url, { width: 256, margin: 1 });
  revalidatePath("/admin");

  return {
    token: created.token,
    dataUrl,
    url,
    createdAt: created.createdAt,
  };
}

export async function revokeQr(token: string): Promise<void> {
  const parsed = TokenStringSchema.parse(token);
  await revokeToken(parsed);
  revalidatePath("/admin");
}

export type ViewSessionQrInput = {
  token: string;
  fallbackCreatedAt: string;
};

export type ViewSessionQrResult = { ok: true; qr: GeneratedQr } | { ok: false; error: string };

// Re-export for the "view" path so the client doesn't import the store directly.
export async function viewSessionQr(input: ViewSessionQrInput): Promise<ViewSessionQrResult> {
  const parseResult = TokenStringSchema.safeParse(input.token);
  if (!parseResult.success) {
    return { ok: false, error: "Token inválido" };
  }
  try {
    const url = `${getBaseUrl()}/cambio/${parseResult.data}`;
    const dataUrl = await toDataURL(url, { width: 256, margin: 1 });
    return {
      ok: true,
      qr: {
        token: parseResult.data,
        dataUrl,
        url,
        createdAt: input.fallbackCreatedAt,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No se pudo generar el QR",
    };
  }
}
