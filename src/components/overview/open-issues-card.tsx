"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { StatCard } from "@/components/overview/stat-card";
import { Modal } from "@/components/ui/modal";

export interface IssueSummary {
  reportId: string;
  projectName: string;
  reportedDate: string;
  otherIssues: string;
  tradeIssues: { tradeName: string; issue: string }[];
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function OpenIssuesCard({ issues }: { issues: IssueSummary[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <StatCard
        label="Open Issues"
        value={issues.length}
        sublabel="reports with issues this week"
        icon={AlertTriangle}
        onClick={() => setOpen(true)}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="Open Issues" size="lg">
        {issues.length === 0 ? (
          <p className="text-sm text-[#64748b]">No open issues right now.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {issues.map((issue) => (
              <Link
                key={issue.reportId}
                href={`/daily-reports/${issue.reportId}`}
                className="group flex flex-col gap-2 rounded-xl border border-[#e2e8f0] bg-white p-4 transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-bold text-[#0f172a]">
                      {issue.projectName}
                    </span>
                    <span className="text-xs text-[#94a3b8]">
                      {formatDate(issue.reportedDate)}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#94a3b8] transition group-hover:translate-x-0.5" />
                </div>

                <div className="flex flex-col gap-1.5">
                  {issue.otherIssues && (
                    <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-800">
                      {issue.otherIssues}
                    </p>
                  )}
                  {issue.tradeIssues.map((trade, index) => (
                    <p
                      key={index}
                      className="rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-800"
                    >
                      <span className="font-semibold">{trade.tradeName}:</span>{" "}
                      {trade.issue}
                    </p>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
