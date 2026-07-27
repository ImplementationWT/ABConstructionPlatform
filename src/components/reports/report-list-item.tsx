import Link from "next/link";
import { HardHat, ChevronRight } from "lucide-react";
import { WeatherIcon } from "@/components/reports/weather-icon";
import { WEATHER_LABELS } from "@/lib/validation/daily-report";
import type { WeatherCondition } from "@/models/DailyReport";

export interface ReportSummary {
  id: string;
  projectName: string;
  reportedDate: Date;
  weatherCondition: WeatherCondition;
  tradesCount: number;
  hasIssues: boolean;
}

const WEATHER_PILL_CLASSES: Record<WeatherCondition, string> = {
  fair: "bg-green-50 text-green-700",
  severe_heat: "bg-orange-50 text-orange-700",
  severe_rain: "bg-blue-50 text-blue-700",
  severe_wind: "bg-slate-100 text-slate-700",
  extreme_weather: "bg-red-100 text-red-800",
};

export function ReportListItem({
  report,
  href,
}: {
  report: ReportSummary;
  href?: string;
}) {
  return (
    <Link
      href={href ?? `/daily-reports/${report.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-[#e2e8f0] bg-white p-4 transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-600 transition group-hover:scale-105">
          <WeatherIcon condition={report.weatherCondition} className="h-5 w-5" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-bold text-[#0f172a]">
            {report.projectName}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 pl-14 text-sm text-[#64748b] sm:pl-0">
        <span className="whitespace-nowrap">
          {report.reportedDate.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <span
          className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold ${WEATHER_PILL_CLASSES[report.weatherCondition]}`}
        >
          {WEATHER_LABELS[report.weatherCondition]}
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-bold text-yellow-700">
          <HardHat className="h-3.5 w-3.5 shrink-0" />
          {report.tradesCount} trade{report.tradesCount === 1 ? "" : "s"}
        </span>
        <ChevronRight className="hidden h-4 w-4 shrink-0 text-[#94a3b8] transition group-hover:translate-x-0.5 group-hover:text-green-600 sm:block" />
      </div>
    </Link>
  );
}
