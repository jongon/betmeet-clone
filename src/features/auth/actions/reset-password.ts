"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordSchema } from "../schemas";

type ResetPasswordState =
  | {
      error?: {
        password?: string[];
        confirmPassword?: string[];
        _form?: string[];
      };
    }
  | undefined;

export async function resetPassword(formData: FormData): Promise<ResetPasswordState> {
  const raw = {
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = ResetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { error: { _form: [error.message] } };
  }

  redirect("/sign-in?reset=success");
}
