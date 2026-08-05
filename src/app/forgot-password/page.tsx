import Image from "next/image";
import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password | General Subcontractor Platform",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#f8fafc] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_25px_60px_-15px_rgba(150,137,129,0.55)] sm:p-10">
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <Image
            src="/logo.png"
            alt="Company logo"
            width={70}
            height={70}
            className="mb-2 h-auto"
          />
          <h1 className="text-lg font-semibold text-[#0f172a]">
            Forgot your password?
          </h1>
          <p className="text-sm text-[#64748b]">
            Enter your email address and we&apos;ll send you a link to reset it.
          </p>
        </div>

        <ForgotPasswordForm />
      </div>
    </div>
  );
}
