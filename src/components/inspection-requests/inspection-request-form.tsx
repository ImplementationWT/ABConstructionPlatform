"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import {
  inspectionRequestSchema,
  type InspectionRequestFormValues,
  type InspectionRequestInput,
} from "@/lib/validation/inspection-request";
import { TRADES } from "@/lib/trades";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MultiSearchableSelect } from "@/components/ui/multi-searchable-select";

const TRADE_OPTIONS = TRADES.map((trade) => ({ value: trade, label: trade }));

const inputClasses =
  "w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition focus:border-[#94a3b8] focus:ring-4 focus:ring-[#94a3b8]/15";

const labelClasses = "text-sm font-medium text-[#334155]";

export interface ProjectOption {
  id: string;
  name: string;
}

export function InspectionRequestForm({
  projects,
  onSuccess,
  onCancel,
}: {
  projects: ProjectOption[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const projectOptions = projects.map((project) => ({
    value: project.id,
    label: project.name,
  }));

  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InspectionRequestFormValues, unknown, InspectionRequestInput>({
    resolver: zodResolver(inspectionRequestSchema),
    defaultValues: {
      projectId: "",
      projectName: "",
      trades: [],
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      details: "",
    },
  });

  const startDate = watch("startDate");

  async function onSubmit(values: InspectionRequestInput) {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/inspection-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Failed to create inspection request");
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
        <label className={labelClasses}>Project Name</label>
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
        {errors.trades && (
          <p className="text-sm text-[#dc2626]">
            {(errors.trades.message as string) ?? "Select at least one trade"}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClasses}>Inspection Timeline</label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="startDate" className="text-xs font-medium text-[#64748b]">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              className={inputClasses}
              {...register("startDate")}
            />
            {errors.startDate && (
              <p className="text-sm text-[#dc2626]">{errors.startDate.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="endDate" className="text-xs font-medium text-[#64748b]">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              min={startDate}
              className={inputClasses}
              {...register("endDate")}
            />
            {errors.endDate && (
              <p className="text-sm text-[#dc2626]">{errors.endDate.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="details" className={labelClasses}>
          Inspection Details
        </label>
        <textarea
          id="details"
          rows={3}
          placeholder="Describe what needs to be inspected..."
          className={`${inputClasses} resize-none`}
          {...register("details")}
        />
        {errors.details && (
          <p className="text-sm text-[#dc2626]">{errors.details.message}</p>
        )}
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
