import { ClipboardCheck, CalendarRange, HardHat } from "lucide-react";

export interface InspectionRequestSummary {
  id: string;
  projectName: string;
  trades: string[];
  startDate: string;
  endDate: string;
  details: string;
  status: "pending_sync" | "synced" | "sync_failed";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function InspectionRequestList({ requests }: { requests: InspectionRequestSummary[] }) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#e2e8f0] bg-white/60 p-8 text-center text-sm text-[#64748b]">
        No inspection requests yet. Click &ldquo;New Request&rdquo; to create one.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((req) => (
        <div
          key={req.id}
          className="group flex flex-col gap-3 rounded-xl border border-[#e2e8f0] bg-white p-4 transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-600 transition group-hover:scale-105">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-bold text-[#0f172a]">{req.projectName}</span>
              <span className="truncate text-sm text-[#64748b]">{req.details}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 pl-14 text-sm text-[#64748b] sm:pl-0">
            <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
              <CalendarRange className="h-3.5 w-3.5 shrink-0" />
              {req.startDate === req.endDate ||
              formatDate(req.startDate) === formatDate(req.endDate)
                ? formatDate(req.startDate)
                : `${formatDate(req.startDate)} - ${formatDate(req.endDate)}`}
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-bold text-yellow-700">
              <HardHat className="h-3.5 w-3.5 shrink-0" />
              {req.trades.length} trade{req.trades.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
