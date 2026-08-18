"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import {
  rfiRequestSchema,
  type RfiRequestFormValues,
  type RfiRequestInput,
} from "@/lib/validation/rfi-request";
import { TRADES } from "@/lib/trades";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MultiSearchableSelect } from "@/components/ui/multi-searchable-select";
import { PhotoUpload, type PhotoValue } from "@/components/reports/photo-upload";

const TRADE_OPTIONS = TRADES.map((trade) => ({ value: trade, label: trade }));

const inputClasses =
  "w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition focus:border-[#94a3b8] focus:ring-4 focus:ring-[#94a3b8]/15";

const labelClasses = "text-sm font-medium text-[#334155]";

function RequiredMark() {
  return <span className="text-[#dc2626]"> *</span>;
}

export interface ProjectOption {
  id: string;
  name: string;
}

export interface AssignableUser {
  id: string;
  name: string;
  email: string;
}

export function RfiRequestForm({
  projects,
  assignableUsers,
  onSuccess,
  onCancel,
}: {
  projects: ProjectOption[];
  assignableUsers: AssignableUser[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const projectOptions = projects.map((project) => ({
    value: project.id,
    label: project.name,
  }));

  const assignableUserOptions = assignableUsers.map((user) => ({
    value: user.id,
    label: user.name || user.email,
    sublabel: user.name && user.email ? user.email : undefined,
  }));

  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RfiRequestFormValues, unknown, RfiRequestInput>({
    resolver: zodResolver(rfiRequestSchema),
    defaultValues: {
      projectId: "",
      projectName: "",
      subject: "",
      question: "",
      trades: [],
      assignedPersons: [],
      attachments: [],
    },
  });

  async function onSubmit(values: RfiRequestInput) {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/rfi-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Failed to create RFI request");
      }

      onSuccess();
    } catch {
      setServerError("Something went wrong while saving the request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className={labelClasses}>
          Project Name
          <RequiredMark />
        </label>
        <Controller
          control={control}
          name="projectId"
          render={({ field }) => (
            <SearchableSelect
              value={field.value}
              onChange={(id) => {
                field.onChange(id);
                const project = projects.find((p) => p.id === id);
                setValue("projectName", project?.name ?? "", { shouldValidate: true });
              }}
              options={projectOptions}
              placeholder="Select a project"
              searchPlaceholder="Search project..."
              emptyLabel="No projects assigned to your account"
            />
          )}
        />
        {errors.projectId && (
          <p className="text-sm text-[#dc2626]">{errors.projectId.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="subject" className={labelClasses}>
          Subject
          <RequiredMark />
        </label>
        <input
          id="subject"
          type="text"
          placeholder="Brief summary of the request"
          className={inputClasses}
          {...register("subject")}
        />
        {errors.subject && <p className="text-sm text-[#dc2626]">{errors.subject.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="question" className={labelClasses}>
          Question
          <RequiredMark />
        </label>
        <textarea
          id="question"
          rows={4}
          placeholder="Describe your question in detail..."
          className={`${inputClasses} resize-none`}
          {...register("question")}
        />
        {errors.question && <p className="text-sm text-[#dc2626]">{errors.question.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClasses}>Trades</label>
        <Controller
          control={control}
          name="trades"
          render={({ field }) => (
            <MultiSearchableSelect
              values={field.value ?? []}
              onChange={field.onChange}
              options={TRADE_OPTIONS}
              placeholder="Select trades"
              searchPlaceholder="Search trade..."
              itemNounPlural="trades"
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClasses}>Assigned Person</label>
        <Controller
          control={control}
          name="assignedPersons"
          render={({ field }) => (
            <MultiSearchableSelect
              values={(field.value ?? []).map((person) => person.id)}
              onChange={(ids) => {
                field.onChange(
                  ids.map((id) => {
                    const user = assignableUsers.find((u) => u.id === id);
                    return { id, name: user?.name ?? "", email: user?.email ?? "" };
                  })
                );
              }}
              options={assignableUserOptions}
              placeholder="Select people"
              searchPlaceholder="Search by name or email..."
              emptyLabel="No users found"
              itemNounPlural="people"
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClasses}>Attachments</label>
        <Controller
          control={control}
          name="attachments"
          render={({ field }) => (
            <PhotoUpload photos={(field.value ?? []) as PhotoValue[]} onChange={field.onChange} />
          )}
        />
      </div>

      {serverError && (
        <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
          {serverError}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
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
              Submitting...
            </>
          ) : (
            "Submit Request"
          )}
        </button>
      </div>
    </form>
  );
}
