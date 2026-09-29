"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ReportListItem, type ReportSummary } from "@/components/reports/report-list-item";
import { SearchableSelect } from "@/components/ui/searchable-select";

export interface DailyReportProjectOption {
  id: string;
  name: string;
}

interface MonthGroup {
  key: string;
  label: string;
  reports: ReportSummary[];
}

function groupByMonth(reports: ReportSummary[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();

  for (const report of reports) {
    const date = report.reportedDate;
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        label: date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
        reports: [],
      };
      groups.set(key, group);
    }
    group.reports.push(report);
  }

  return Array.from(groups.values());
}

function MonthGroupSection({
  group,
  isOpen,
  onToggle,
}: {
  group: MonthGroup;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-left transition hover:bg-[#f1f5f9]"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
          {group.label}
          <span className="rounded-full border border-[#e2e8f0] bg-white px-2 py-0.5 text-xs font-bold text-[#64748b]">
            {group.reports.length}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#64748b] transition-transform duration-300 ease-in-out ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div inert={!isOpen} className="flex flex-col gap-2 pb-1 pt-0.5">
            {group.reports.map((report) => (
              <ReportListItem key={report.id} report={report} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DailyReportsList({
  reports,
  projects,
}: {
  reports: ReportSummary[];
  projects: DailyReportProjectOption[];
}) {
  const [projectFilter, setProjectFilter] = useState("");
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const projectOptions = useMemo(
    () => [
      { value: "", label: "All Projects" },
      ...projects.map((project) => ({ value: project.id, label: project.name })),
    ],
    [projects]
  );

  const filteredReports = useMemo(
    () => (projectFilter ? reports.filter((r) => r.projectId === projectFilter) : reports),
    [reports, projectFilter]
  );

  const monthGroups = useMemo(() => groupByMonth(filteredReports), [filteredReports]);

  function toggleMonth(key: string) {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full sm:w-72">
        <SearchableSelect
          value={projectFilter}
          onChange={setProjectFilter}
          options={projectOptions}
          placeholder="Filter by project"
          searchPlaceholder="Search project..."
          emptyLabel="No projects found"
        />
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#e2e8f0] bg-white/60 p-10 text-center text-sm text-[#64748b]">
          No reports yet. Click &ldquo;New Report&rdquo; to create the first one.
        </div>
      ) : monthGroups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#e2e8f0] bg-white/60 p-10 text-center text-sm text-[#64748b]">
          No reports found for this project.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {monthGroups.map((group) => (
            <MonthGroupSection
              key={group.key}
              group={group}
              isOpen={expandedMonths.has(group.key)}
              onToggle={() => toggleMonth(group.key)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
