"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Lock, Eye, EyeOff, Check, ArrowLeft } from "lucide-react";

const resetPasswordFormSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token) return;

    setServerError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: values.password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Request failed");
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-[#dc2626]">
          This link is invalid or missing a token. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          Request a new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
          <Check className="h-6 w-6" />
        </div>
        <p className="text-sm text-[#334155]">
          Your password has been updated. Redirecting you to sign in...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-[#334155]">
          New password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#94a3b8]" />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] py-3 pl-11 pr-11 text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition focus:border-[#94a3b8] focus:ring-4 focus:ring-[#94a3b8]/15"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] transition hover:text-[#94a3b8]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4.5 w-4.5" />
            ) : (
              <Eye className="h-4.5 w-4.5" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-[#dc2626]">{errors.password.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-[#334155]">
          Confirm new password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#94a3b8]" />
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Re-enter the new password"
            className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] py-3 pl-11 pr-4 text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition focus:border-[#94a3b8] focus:ring-4 focus:ring-[#94a3b8]/15"
            {...register("confirmPassword")}
          />
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-[#dc2626]">{errors.confirmPassword.message}</p>
        )}
      </div>

      {serverError && (
        <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-primary-hover focus:outline-none focus:ring-4 focus:ring-[#94a3b8]/30 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
            Updating...
          </>
        ) : (
          "Update password"
        )}
      </button>
    </form>
  );
}
