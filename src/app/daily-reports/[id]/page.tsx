import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  ArrowLeft,
  HardHat,
  Users,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { userCanAccessProject } from "@/lib/get-project-filter";
import { DailyReport } from "@/models/DailyReport";
import { WeatherIcon } from "@/components/reports/weather-icon";
import { WEATHER_LABELS } from "@/lib/validation/daily-report";
import type { IPhoto, ITradeEntry, SyncStatus, WeatherCondition } from "@/models/DailyReport";

export const dynamic = "force-dynamic";

function SyncStatusBadge({
  status,
  syncError,
}: {
  status: SyncStatus;
  syncError?: string;
}) {
  if (status === "synced") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Synced to Monday
      </span>
    );
  }

  if (status === "sync_failed") {
    return (
      <span
        title={syncError}
        className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700"
      >
        <XCircle className="h-3.5 w-3.5" />
        Monday sync failed
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
      <RefreshCw className="h-3.5 w-3.5" />
      Syncing to Monday...
    </span>
  );
}

export default async function DailyReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  await connectToDatabase();

  const report = await DailyReport.findById(id)
    .populate("createdBy", "name email")
    .lean();

  if (!report || !(await userCanAccessProject(session.user.id, report.projectId))) {
    notFound();
  }

  const reportedDate = new Date(report.reportedDate);
  const createdBy = report.createdBy as unknown as { name?: string; email?: string } | null;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/daily-reports"
        className="flex w-fit items-center gap-2 text-sm font-medium text-[#64748b] transition hover:text-[#334155]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Daily Reports
      </Link>

      <div className="flex flex-col gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-[#0f172a]">{report.projectName}</h1>
          <SyncStatusBadge status={report.status} syncError={report.syncError} />
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#334155]">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-[#94a3b8]" />
            {reportedDate.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })}
          </span>
          <span className="flex items-center gap-1.5 font-bold">
            <WeatherIcon
              condition={report.weatherCondition as WeatherCondition}
              className="h-4 w-4 text-[#94a3b8]"
            />
            {WEATHER_LABELS[report.weatherCondition as WeatherCondition]}
          </span>
          {createdBy?.name && (
            <span className="text-[#94a3b8]">Logged by {createdBy.name}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-[#0f172a]">Trades Progress</h2>

        {report.trades.length === 0 ? (
          <p className="text-sm text-[#64748b]">No trades were logged for this report.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {report.trades.map((trade: ITradeEntry, index: number) => (
              <div
                key={index}
                className="flex flex-col gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2 font-bold text-[#0f172a]">
                    <HardHat className="h-4.5 w-4.5 text-[#334155]" />
                    {trade.tradeName}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-[#f1f5f9] px-3 py-1 text-xs font-bold text-[#334155]">
                    <Users className="h-3.5 w-3.5" />
                    {trade.manpower} worker{trade.manpower === 1 ? "" : "s"}
                  </span>
                </div>

                {trade.progress && (
                  <p className="whitespace-pre-wrap text-sm text-[#334155]">
                    {trade.progress}
                  </p>
                )}

                {trade.issues && (
                  <div className="flex items-start gap-2 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3.5 py-2.5 text-sm text-[#b91c1c]">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="whitespace-pre-wrap">{trade.issues}</span>
                  </div>
                )}

                {trade.photos.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {trade.photos.map((photo: IPhoto, photoIndex: number) => (
                      <a
                        key={photoIndex}
                        href={photo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#e2e8f0]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={photo.name}
                          className="h-full w-full object-cover transition hover:scale-105"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {report.otherIssues && (
        <div className="flex flex-col gap-2 rounded-xl border border-[#e2e8f0] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#0f172a]">Other Issues</h2>
          <p className="whitespace-pre-wrap text-sm text-[#334155]">{report.otherIssues}</p>
        </div>
      )}
    </div>
  );
}
