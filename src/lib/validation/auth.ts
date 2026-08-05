import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Missing token"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type ForgotPasswordInput = z.output<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.output<typeof resetPasswordSchema>;
