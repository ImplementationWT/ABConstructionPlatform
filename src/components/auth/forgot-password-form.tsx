"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, ArrowLeft, MailCheck } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address").min(1, "Enter your email address"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      setSubmitted(true);
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
          <MailCheck className="h-6 w-6" />
        </div>
        <p className="text-sm text-[#334155]">
          If an account exists for that email, we&apos;ve sent a link to reset your
          password. The link expires in 5 minutes.
        </p>
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-[#334155]">
          Email address
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#94a3b8]" />
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] py-3 pl-11 pr-4 text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition focus:border-[#94a3b8] focus:ring-4 focus:ring-[#94a3b8]/15"
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p className="text-sm text-[#dc2626]">{errors.email.message}</p>
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
            Sending...
          </>
        ) : (
          "Send reset link"
        )}
      </button>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-sm font-medium text-[#64748b] hover:text-[#334155]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>
    </form>
  );
}
