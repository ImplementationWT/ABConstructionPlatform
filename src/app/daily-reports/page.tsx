import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { getAccessibleProjects } from "@/lib/get-accessible-projects";
import { getProjectAccessFilter } from "@/lib/get-project-filter";
import { DailyReport } from "@/models/DailyReport";
import { ReportListItem, type ReportSummary } from "@/components/reports/report-list-item";
import { NewDailyReportButton } from "@/components/reports/new-daily-report-button";
import type { ITradeEntry, WeatherCondition } from "@/models/DailyReport";

export const dynamic = "force-dynamic";

export default async function DailyReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  await connectToDatabase();

  const [reportsRaw, accessibleProjects] = await Promise.all([
    getProjectAccessFilter(session.user.id).then((filter) =>
      DailyReport.find(filter).sort({ reportedDate: -1, createdAt: -1 }).limit(200).lean()
    ),
    getAccessibleProjects(session.user.id),
  ]);

  const reports: ReportSummary[] = reportsRaw.map((r) => ({
    id: r._id.toString(),
    projectName: r.projectName,
    reportedDate: new Date(r.reportedDate),
    weatherCondition: r.weatherCondition as WeatherCondition,
    tradesCount: r.trades?.length ?? 0,
    hasIssues:
      Boolean(r.otherIssues) ||
      (r.trades ?? []).some((t: ITradeEntry) => t.issues),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold text-[#0f172a]">Daily Reports</h1>
          <p className="text-sm text-[#64748b]">
            Track daily progress, manpower, and issues across every trade.
          </p>
        </div>
        <NewDailyReportButton
          projects={accessibleProjects.map((project) => ({ id: project.id, name: project.name }))}
        />
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#e2e8f0] bg-white/60 p-10 text-center text-sm text-[#64748b]">
          No reports yet. Click &ldquo;New Report&rdquo; to create the first one.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((report) => (
            <ReportListItem key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
