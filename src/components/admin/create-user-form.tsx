"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import {
  createUserSchema,
  type CreateUserFormValues,
  type CreateUserInput,
} from "@/lib/validation/user";
import { MultiSearchableSelect } from "@/components/ui/multi-searchable-select";

const inputClasses =
  "w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition focus:border-[#94a3b8] focus:ring-4 focus:ring-[#94a3b8]/15";

const labelClasses = "text-sm font-medium text-[#334155]";

export function CreateUserForm({
  projects,
}: {
  projects: { id: string; name: string; status: string }[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateUserFormValues, unknown, CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "user",
      allowedProjectIds: [],
    },
  });

  const role = watch("role");

  const projectOptions = projects.map((project) => ({
    value: project.id,
    label: project.name,
    sublabel: project.status,
  }));

  async function onSubmit(values: CreateUserInput) {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.status === 409) {
        setServerError("A user with this email already exists.");
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to create user");
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setServerError("Something went wrong while creating the user. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5 rounded-xl border border-[#e2e8f0] bg-white p-5 sm:p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className={labelClasses}>
            Full Name
          </label>
          <input
            id="name"
            placeholder="e.g. Jane Doe"
            className={inputClasses}
            {...register("name")}
          />
          {errors.name && <p className="text-sm text-[#dc2626]">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={labelClasses}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@company.com"
            className={inputClasses}
            {...register("email")}
          />
          {errors.email && <p className="text-sm text-[#dc2626]">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className={labelClasses}>
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              className={`${inputClasses} pr-11`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] transition hover:text-[#94a3b8]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-[#dc2626]">{errors.password.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClasses}>Role</label>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <div className="flex gap-2">
                {(["user", "admin"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => field.onChange(r)}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition ${
                      field.value === r
                        ? "border-[#0f172a] bg-[#f1f5f9] text-[#0f172a]"
                        : "border-[#e2e8f0] text-[#334155] hover:bg-[#f8fafc]"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          />
        </div>
      </div>

      {role === "user" && (
        <div className="flex flex-col gap-1.5">
          <label className={labelClasses}>Assigned Projects</label>
          <Controller
            control={control}
            name="allowedProjectIds"
            render={({ field }) => (
              <MultiSearchableSelect
                values={field.value ?? []}
                onChange={field.onChange}
                options={projectOptions}
                placeholder="No projects assigned"
                searchPlaceholder="Search project..."
                emptyLabel="No projects found"
                itemNounPlural="projects"
              />
            )}
          />
        </div>
      )}

      {serverError && (
        <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
          {serverError}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="rounded-xl border border-[#e2e8f0] px-5 py-2.5 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
              Creating...
            </>
          ) : (
            "Create User"
          )}
        </button>
      </div>
    </form>
  );
}
