"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, HardHat, Users } from "lucide-react";
import {
  dailyReportEditSchema,
  type DailyReportEditFormValues,
  type DailyReportEditInput,
} from "@/lib/validation/daily-report";
import { PhotoUpload, type PhotoValue } from "@/components/reports/photo-upload";

const MAX_PHOTOS_PER_TRADE = 8;

const inputClasses =
  "w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition focus:border-[#94a3b8] focus:ring-4 focus:ring-[#94a3b8]/15";

const labelClasses = "text-sm font-medium text-[#334155]";

export interface EditableReport {
  id: string;
  otherIssues: string;
  trades: {
    tradeName: string;
    manpower: number;
    progress: string;
    issues: string;
    photos: PhotoValue[];
  }[];
}

export function EditReportForm({
  report,
  onSuccess,
  onCancel,
}: {
  report: EditableReport;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DailyReportEditFormValues, unknown, DailyReportEditInput>({
    resolver: zodResolver(dailyReportEditSchema),
    defaultValues: {
      trades: report.trades.map((trade) => ({
        progress: trade.progress,
        issues: trade.issues,
        newPhotos: [],
      })),
      otherIssues: report.otherIssues,
    },
  });

  async function onSubmit(values: DailyReportEditInput) {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Failed to update report");
      }

      onSuccess();
    } catch {
      setServerError("Something went wrong while saving your changes. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[#0f172a]">Trades Progress</h2>

        {report.trades.map((trade, index) => {
          const tradeErrors = errors.trades?.[index];
          const remainingSlots = MAX_PHOTOS_PER_TRADE - trade.photos.length;

          return (
            <div
              key={index}
              className="flex flex-col gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-bold text-[#0f172a]">
                  <HardHat className="h-4 w-4 text-[#334155]" />
                  {trade.tradeName}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-[#f1f5f9] px-2 py-0.5 text-xs font-bold text-[#334155]">
                  <Users className="h-3.5 w-3.5" />
                  {trade.manpower} worker{trade.manpower === 1 ? "" : "s"}
                </span>
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
                  <p className="text-sm text-[#dc2626]">{tradeErrors.progress.message}</p>
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
                {trade.photos.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {trade.photos.map((photo, photoIndex) => (
                      <div
                        key={photoIndex}
                        className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#e2e8f0]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={photo.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {remainingSlots > 0 ? (
                  <PhotoUpload
                    photos={watch(`trades.${index}.newPhotos`) ?? []}
                    maxPhotos={remainingSlots}
                    onChange={(photos) =>
                      setValue(`trades.${index}.newPhotos`, photos, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  />
                ) : (
                  <p className="text-xs text-[#64748b]">
                    This trade already has the maximum of {MAX_PHOTOS_PER_TRADE} photos.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </section>

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
            "Save Changes"
          )}
        </button>
      </div>
    </form>
  );
}
