import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ClipboardList, CalendarDays, Building2, Users } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { getProjectAccessFilter } from "@/lib/get-project-filter";
import { DailyReport } from "@/models/DailyReport";
import { StatCard } from "@/components/overview/stat-card";
import { OpenIssuesCard, type IssueSummary } from "@/components/overview/open-issues-card";
import { ReportListItem, type ReportSummary } from "@/components/reports/report-list-item";
import type { ITradeEntry, WeatherCondition } from "@/models/DailyReport";

export const dynamic = "force-dynamic";

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function OverviewPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  await connectToDatabase();

  const weekStart = startOfWeek(new Date());
  const projectFilter = await getProjectAccessFilter(session.user.id);

  const [totalReports, reportsThisWeek, projects, reportsWithIssuesRaw, manpowerAgg, recentReportsRaw] =
    await Promise.all([
      DailyReport.countDocuments(projectFilter),
      DailyReport.countDocuments({ ...projectFilter, reportedDate: { $gte: weekStart } }),
      DailyReport.distinct("projectName", projectFilter),
      DailyReport.find({
        ...projectFilter,
        $or: [{ otherIssues: { $ne: "" } }, { "trades.issues": { $ne: "" } }],
      })
        .sort({ reportedDate: -1 })
        .lean(),
      DailyReport.aggregate([
        { $match: { ...projectFilter, reportedDate: { $gte: weekStart } } },
        { $unwind: "$trades" },
        { $group: { _id: null, total: { $sum: "$trades.manpower" } } },
      ]),
      DailyReport.find(projectFilter)
        .sort({ reportedDate: -1, createdAt: -1 })
        .limit(6)
        .lean(),
    ]);

  const manpowerThisWeek = manpowerAgg[0]?.total ?? 0;

  const issues: IssueSummary[] = reportsWithIssuesRaw.map((r) => ({
    reportId: r._id.toString(),
    projectName: r.projectName,
    reportedDate: new Date(r.reportedDate).toISOString(),
    otherIssues: r.otherIssues ?? "",
    tradeIssues: (r.trades ?? [])
      .filter((t: ITradeEntry) => t.issues)
      .map((t: ITradeEntry) => ({ tradeName: t.tradeName, issue: t.issues })),
  }));

  const recentReports: ReportSummary[] = recentReportsRaw.map((r) => ({
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
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-[#0f172a]">Overview</h1>
          <p className="text-sm text-[#64748b]">
            A snapshot of daily reporting activity across your projects.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Reports" value={totalReports} icon={ClipboardList} />
        <StatCard
          label="This Week"
          value={reportsThisWeek}
          sublabel="reports since Monday"
          icon={CalendarDays}
        />
        <OpenIssuesCard issues={issues} />
        <StatCard
          label="Manpower"
          value={manpowerThisWeek}
          sublabel="workers logged this week"
          icon={Users}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#0f172a]">Recent Reports</h2>
          <Link
            href="/daily-reports"
            className="text-sm font-medium text-[#334155] hover:underline"
          >
            View all
          </Link>
        </div>

        {recentReports.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#e2e8f0] bg-white/60 p-8 text-center text-sm text-[#64748b]">
            No reports yet. Create your first daily report to see it here.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentReports.map((report) => (
              <ReportListItem key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
