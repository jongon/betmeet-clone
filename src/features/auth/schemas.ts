import { z } from "zod";

export const SignUpSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const SignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const ResetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmNewPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export const EmailChangeSchema = z.object({
  newEmail: z.string().email("Invalid email address"),
});

export const ResendConfirmationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const ChangeUnconfirmedEmailSchema = z
  .object({
    currentEmail: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    newEmail: z.string().email("Invalid email address"),
  })
  .refine((d) => d.newEmail.trim().toLowerCase() !== d.currentEmail.trim().toLowerCase(), {
    message: "The new email must be different from the current one",
    path: ["newEmail"],
  });

export type SignUpInput = z.infer<typeof SignUpSchema>;
export type SignInInput = z.infer<typeof SignInSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type EmailChangeInput = z.infer<typeof EmailChangeSchema>;
export type ResendConfirmationInput = z.infer<typeof ResendConfirmationSchema>;
export type ChangeUnconfirmedEmailInput = z.infer<typeof ChangeUnconfirmedEmailSchema>;
