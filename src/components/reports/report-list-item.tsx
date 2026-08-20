import Link from "next/link";
import { HardHat, ChevronRight } from "lucide-react";
import { WeatherIcon } from "@/components/reports/weather-icon";
import { WEATHER_LABELS } from "@/lib/validation/daily-report";
import type { WeatherCondition } from "@/models/DailyReport";

export interface ReportSummary {
  id: string;
  projectId: string;
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
      className="group flex items-center gap-3 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 transition hover:border-gray-300 hover:bg-[#f8fafc]"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-600">
        <WeatherIcon condition={report.weatherCondition} className="h-3.5 w-3.5" />
      </div>

      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#0f172a]">
        {report.projectName}
      </span>

      <span className="shrink-0 whitespace-nowrap text-xs text-[#64748b]">
        {report.reportedDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </span>

      <span
        className={`hidden shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold sm:inline-block ${WEATHER_PILL_CLASSES[report.weatherCondition]}`}
      >
        {WEATHER_LABELS[report.weatherCondition]}
      </span>

      <span className="hidden shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-bold text-yellow-700 sm:flex">
        <HardHat className="h-3 w-3 shrink-0" />
        {report.tradesCount}
      </span>

      <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-[#94a3b8] transition group-hover:translate-x-0.5 group-hover:text-green-600 sm:block" />
    </Link>
  );
}
