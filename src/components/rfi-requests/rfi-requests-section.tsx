"use client";

import { useState } from "react";
import { FileQuestion, HardHat, Paperclip } from "lucide-react";
import { Modal } from "@/components/ui/modal";

export interface RfiAttachment {
  url: string;
  name: string;
}

export interface RfiRequestSummary {
  id: string;
  projectName: string;
  subject: string;
  question: string;
  trades: string[];
  attachments: RfiAttachment[];
  status: "pending_sync" | "synced" | "sync_failed";
}

export function RfiRequestList({ requests }: { requests: RfiRequestSummary[] }) {
  const [selected, setSelected] = useState<RfiRequestSummary | null>(null);

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#e2e8f0] bg-white/60 p-8 text-center text-sm text-[#64748b]">
        No RFI requests yet. Click &ldquo;New Request&rdquo; to create one.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((req) => (
        <button
          key={req.id}
          type="button"
          onClick={() => setSelected(req)}
          className="group flex flex-col gap-3 rounded-xl border border-[#e2e8f0] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-600 transition group-hover:scale-105">
              <FileQuestion className="h-5 w-5" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-bold text-[#0f172a]">{req.subject}</span>
              <span className="truncate text-sm text-[#64748b]">{req.projectName}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 pl-14 text-sm text-[#64748b] sm:pl-0">
            <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-bold text-yellow-700">
              <HardHat className="h-3.5 w-3.5 shrink-0" />
              {req.trades.length} trade{req.trades.length === 1 ? "" : "s"}
            </span>
            {req.attachments.length > 0 && (
              <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                {req.attachments.length}
              </span>
            )}
          </div>
        </button>
      ))}

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.subject ?? "RFI Request"}
      >
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-bold text-yellow-700">
                <HardHat className="h-3.5 w-3.5 shrink-0" />
                {selected.trades.length} trade{selected.trades.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                Project
              </span>
              <span className="text-sm font-medium text-[#0f172a]">{selected.projectName}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                Trades
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selected.trades.map((trade) => (
                  <span
                    key={trade}
                    className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-medium text-[#334155]"
                  >
                    {trade}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                Question
              </span>
              <p className="whitespace-pre-wrap text-sm text-[#334155]">{selected.question}</p>
            </div>

            {selected.attachments.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                  Attachments
                </span>
                <div className="flex flex-wrap gap-3">
                  {selected.attachments.map((attachment, index) => (
                    <a
                      key={`${attachment.url}-${index}`}
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#e2e8f0]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="h-full w-full object-cover transition group-hover:opacity-80"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
