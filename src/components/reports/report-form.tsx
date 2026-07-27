"use client";

import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Trash2,
  Loader2,
  HardHat,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import {
  dailyReportSchema,
  type DailyReportFormValues,
  type DailyReportInput,
  WEATHER_CONDITIONS,
  WEATHER_LABELS,
} from "@/lib/validation/daily-report";
import { TRADES } from "@/lib/trades";
import { PhotoUpload } from "@/components/reports/photo-upload";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { WeatherIcon } from "@/components/reports/weather-icon";

const TRADE_OPTIONS = TRADES.map((trade) => ({ value: trade, label: trade }));

const EMPTY_TRADE = {
  tradeName: TRADES[0],
  manpower: 0,
  progress: "",
  issues: "",
  photos: [],
};

const inputClasses =
  "w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition focus:border-[#94a3b8] focus:ring-4 focus:ring-[#94a3b8]/15";

const labelClasses = "text-sm font-medium text-[#334155]";

export interface ProjectOption {
  id: string;
  name: string;
}

export function ReportForm({
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
  } = useForm<DailyReportFormValues, unknown, DailyReportInput>({
    resolver: zodResolver(dailyReportSchema),
    defaultValues: {
      projectId: "",
      projectName: "",
      reportedDate: new Date().toISOString().slice(0, 10),
      weatherCondition: "fair",
      trades: [EMPTY_TRADE],
      otherIssues: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "trades" });

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  function toggleCollapsed(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function onSubmit(values: DailyReportInput) {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Failed to create report");
      }

      onSuccess();
    } catch {
      setServerError("Something went wrong while saving the report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8">
      {/* Report details */}
      <section className="flex flex-col gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-[#0f172a]">Report Details</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="projectName" className={labelClasses}>
              Project Name
            </label>
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <SearchableSelect
                  id="projectName"
                  value={field.value}
                  onChange={(id) => {
                    field.onChange(id);
                    const project = projects.find((p) => p.id === id);
                    setValue("projectName", project?.name ?? "", {
                      shouldValidate: true,
                    });
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
            {projects.length === 0 && (
              <p className="text-sm text-[#b91c1c]">
                No projects are assigned to your account yet. Contact your admin.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="reportedDate" className={labelClasses}>
              Reported Date
            </label>
            <input
              id="reportedDate"
              type="date"
              className={inputClasses}
              {...register("reportedDate")}
            />
            {errors.reportedDate && (
              <p className="text-sm text-[#dc2626]">{errors.reportedDate.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="weatherCondition" className={labelClasses}>
              Weather Condition
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                <WeatherIcon condition={watch("weatherCondition")} className="h-4.5 w-4.5" />
              </span>
              <select
                id="weatherCondition"
                className={`${inputClasses} appearance-none pl-11 pr-10`}
                {...register("weatherCondition")}
              >
                {WEATHER_CONDITIONS.map((condition) => (
                  <option key={condition} value={condition}>
                    {WEATHER_LABELS[condition]}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#94a3b8]" />
            </div>
          </div>
        </div>
      </section>

      {/* Trades progress */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#0f172a]">Trades Progress</h2>
          <button
            type="button"
            onClick={() => append(EMPTY_TRADE)}
            className="flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] px-3 py-1.5 text-sm font-medium text-[#334155] transition hover:bg-[#f8fafc]"
          >
            <Plus className="h-4 w-4" />
            Add Trade
          </button>
        </div>

        {errors.trades?.root && (
          <p className="text-sm text-[#dc2626]">{errors.trades.root.message}</p>
        )}
        {errors.trades && !Array.isArray(errors.trades) && !errors.trades.root && (
          <p className="text-sm text-[#dc2626]">{errors.trades.message as string}</p>
        )}

        <div className="flex flex-col gap-3">
          {fields.map((field, index) => {
            const tradeErrors = errors.trades?.[index];
            const hasErrors = Boolean(tradeErrors);
            const isCollapsed = collapsedIds.has(field.id);
            const tradeName = watch(`trades.${index}.tradeName`);
            const manpower = watch(`trades.${index}.manpower`);

            return (
              <div
                key={field.id}
                className="flex flex-col rounded-xl border border-[#e2e8f0] bg-white transition hover:shadow-sm"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleCollapsed(field.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleCollapsed(field.id);
                    }
                  }}
                  aria-expanded={!isCollapsed}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left sm:px-6"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-[#0f172a]">
                    <HardHat className="h-4 w-4 shrink-0 text-[#334155]" />
                    <span className="truncate">{tradeName || `Trade ${index + 1}`}</span>
                    {manpower > 0 && (
                      <span className="shrink-0 rounded-full bg-[#f1f5f9] px-2 py-0.5 text-xs font-bold text-[#334155]">
                        {manpower} worker{manpower === 1 ? "" : "s"}
                      </span>
                    )}
                    {hasErrors && (
                      <AlertCircle className="h-4 w-4 shrink-0 text-[#dc2626]" />
                    )}
                  </span>

                  <span className="flex shrink-0 items-center gap-1">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(index);
                        }}
                        aria-label={`Remove trade ${index + 1}`}
                        className="rounded-lg p-1.5 text-[#b91c1c] transition hover:bg-[#fef2f2]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <ChevronDown
                      className={`h-4.5 w-4.5 text-[#64748b] transition-transform duration-300 ease-in-out ${
                        isCollapsed ? "" : "rotate-180"
                      }`}
                    />
                  </span>
                </div>

                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div
                      inert={isCollapsed}
                      className="flex flex-col gap-4 border-t border-[#e2e8f0] px-5 pb-5 pt-4 sm:px-6 sm:pb-6"
                    >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className={labelClasses}>Trade</label>
                        <Controller
                          control={control}
                          name={`trades.${index}.tradeName` as const}
                          render={({ field }) => (
                            <SearchableSelect
                              value={field.value}
                              onChange={field.onChange}
                              options={TRADE_OPTIONS}
                              searchPlaceholder="Search trade..."
                            />
                          )}
                        />
                        {tradeErrors?.tradeName && (
                          <p className="text-sm text-[#dc2626]">
                            {tradeErrors.tradeName.message}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className={labelClasses}>Manpower</label>
                        <input
                          type="number"
                          min={0}
                          placeholder="e.g. 6"
                          className={inputClasses}
                          {...register(`trades.${index}.manpower` as const, {
                            valueAsNumber: true,
                          })}
                        />
                        {tradeErrors?.manpower && (
                          <p className="text-sm text-[#dc2626]">
                            {tradeErrors.manpower.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className={labelClasses}>Progress</label>
                      <textarea
                        rows={3}
                        placeholder="Describe what was done for this trade today..."
                        className={`${inputClasses} resize-none`}
                        {...register(`trades.${index}.progress` as const)}
                      />
                      {tradeErrors?.progress && (
                        <p className="text-sm text-[#dc2626]">
                          {tradeErrors.progress.message}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className={labelClasses}>Issues</label>
                      <textarea
                        rows={2}
                        placeholder="Any issues for this trade? (optional)"
                        className={`${inputClasses} resize-none`}
                        {...register(`trades.${index}.issues` as const)}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className={labelClasses}>Photos</label>
                      <PhotoUpload
                        photos={watch(`trades.${index}.photos`) ?? []}
                        onChange={(photos) =>
                          setValue(`trades.${index}.photos`, photos, {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                      />
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Other issues */}
      <section className="flex flex-col gap-2 rounded-xl border border-[#e2e8f0] bg-white p-5 sm:p-6">
        <label htmlFor="otherIssues" className="text-base font-semibold text-[#0f172a]">
          Other Issues
        </label>
        <p className="text-sm text-[#64748b]">
          Anything else worth flagging that isn&rsquo;t tied to a specific trade.
        </p>
        <textarea
          id="otherIssues"
          rows={3}
          placeholder="Optional notes..."
          className={`${inputClasses} resize-none`}
          {...register("otherIssues")}
        />
      </section>

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
              Saving...
            </>
          ) : (
            "Save Report"
          )}
        </button>
      </div>
    </form>
  );
}
