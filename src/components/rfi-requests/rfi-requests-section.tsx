"use client";

import { useEffect, useRef, useState } from "react";
import {
  File as FileIcon,
  FileQuestion,
  HardHat,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";

const MAX_REPLY_ATTACHMENTS = 5;
const MAX_REPLY_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export interface RfiAttachment {
  url: string;
  name: string;
}

export interface RfiAssignedPerson {
  id: string;
  name: string;
  email: string;
}

export interface RfiRequestSummary {
  id: string;
  projectName: string;
  subject: string;
  question: string;
  trades: string[];
  attachments: RfiAttachment[];
  assignedPersons: RfiAssignedPerson[];
  status: "pending_sync" | "synced" | "sync_failed";
  mondayStatus?: string;
}

const MONDAY_STATUS_STYLES: Record<string, string> = {
  "New Request": "bg-blue-50 text-blue-700",
  Pending: "bg-orange-50 text-orange-700",
  Answered: "bg-purple-50 text-purple-700",
  Completed: "bg-green-50 text-green-700",
  Cancelled: "bg-red-50 text-red-700",
};

function StatusBadge({
  mondayStatus,
  syncStatus,
}: {
  mondayStatus?: string;
  syncStatus: RfiRequestSummary["status"];
}) {
  if (mondayStatus) {
    return (
      <span
        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${
          MONDAY_STATUS_STYLES[mondayStatus] ?? "bg-gray-100 text-gray-700"
        }`}
      >
        {mondayStatus}
      </span>
    );
  }

  if (syncStatus === "sync_failed") {
    return (
      <span className="whitespace-nowrap rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
        Sync Failed
      </span>
    );
  }

  if (syncStatus === "pending_sync") {
    return (
      <span className="whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
        Syncing…
      </span>
    );
  }

  return null;
}

interface RfiUpdateAsset {
  id: string;
  name: string;
  url: string;
  fileExtension: string | null;
}

interface RfiUpdate {
  id: string;
  textBody: string;
  createdAt: string;
  creatorName: string | null;
  assets: RfiUpdateAsset[];
}

function UpdateAttachments({ assets }: { assets: RfiUpdateAsset[] }) {
  if (assets.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {assets.map((asset) => (
        <a
          key={asset.id}
          href={asset.url}
          target="_blank"
          rel="noreferrer"
          className="flex max-w-45 items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#334155] transition hover:border-gray-300 hover:bg-[#f8fafc]"
        >
          <FileIcon className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" />
          <span className="truncate">{asset.name}</span>
        </a>
      ))}
    </div>
  );
}

function RfiAnswers({
  requestId,
  synced,
  initialStatus,
  onStatusChange,
}: {
  requestId: string;
  synced: boolean;
  initialStatus?: string;
  onStatusChange?: (status: string | null) => void;
}) {
  const [updates, setUpdates] = useState<RfiUpdate[] | null>(null);
  const [status, setStatus] = useState<string | null>(initialStatus ?? null);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<RfiAttachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isCompleted = status === "Completed";

  useEffect(() => {
    if (!synced) return;

    let cancelled = false;

    fetch(`/api/rfi-requests/${requestId}/updates`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load updates");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setUpdates(data.updates);
          setStatus(data.status ?? null);
          onStatusChange?.(data.status ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, synced]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [updates?.length]);

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setAttachError(null);

    const selected = Array.from(files);

    if (pendingAttachments.length + selected.length > MAX_REPLY_ATTACHMENTS) {
      setAttachError(`You can attach up to ${MAX_REPLY_ATTACHMENTS} files`);
      return;
    }

    const oversized = selected.find((file) => file.size > MAX_REPLY_ATTACHMENT_SIZE_BYTES);
    if (oversized) {
      setAttachError(`"${oversized.name}" is larger than 15MB`);
      return;
    }

    try {
      const converted = await Promise.all(
        selected.map(async (file) => ({ url: await fileToDataUrl(file), name: file.name }))
      );
      setPendingAttachments((prev) => [...prev, ...converted]);
    } catch {
      setAttachError("Could not read one of the selected files");
    }
  }

  function removePendingAttachment(index: number) {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSend() {
    const trimmed = message.trim();
    if ((!trimmed && pendingAttachments.length === 0) || isSending) return;

    setIsSending(true);
    setSendError(null);

    try {
      const response = await fetch(`/api/rfi-requests/${requestId}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, attachments: pendingAttachments }),
      });

      if (!response.ok) {
        throw new Error("Failed to send reply");
      }

      const data = await response.json();
      setUpdates((prev) => [...(prev ?? []), data.update]);
      setStatus(data.status ?? "Pending");
      onStatusChange?.(data.status ?? "Pending");
      setMessage("");
      setPendingAttachments([]);
    } catch {
      setSendError("Could not send your reply. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
        Updates
      </span>

      {!synced && (
        <p className="text-sm text-[#94a3b8]">
          This request has not synced to Monday yet, so updates are not available.
        </p>
      )}

      {synced && error && (
        <p className="text-sm text-red-600">Could not load updates. Please try again.</p>
      )}

      {synced && !error && updates === null && (
        <p className="text-sm text-[#94a3b8]">Loading updates…</p>
      )}

      {synced && !error && updates !== null && updates.length === 0 && (
        <p className="text-sm text-[#94a3b8]">No updates yet.</p>
      )}

      {synced && !error && updates !== null && updates.length > 0 && (
        <div className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
          {updates.map((update) => (
            <div
              key={update.id}
              className="flex flex-col gap-1 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#334155]">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  {update.creatorName ?? "Unknown"}
                </span>
                <span className="text-xs text-[#94a3b8]">
                  {new Date(update.createdAt).toLocaleString()}
                </span>
              </div>
              {update.textBody && (
                <p className="whitespace-pre-wrap text-sm text-[#334155]">
                  {update.textBody}
                </p>
              )}
              <UpdateAttachments assets={update.assets} />
            </div>
          ))}
          <div ref={listEndRef} />
        </div>
      )}

      {synced && !error && updates !== null && isCompleted && (
        <p className="mt-1 text-sm text-[#94a3b8]">
          This request has been marked as completed, so new replies are disabled.
        </p>
      )}

      {synced && !error && updates !== null && !isCompleted && (
        <div className="mt-2 flex flex-col gap-1.5">
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pendingAttachments.map((attachment, index) => (
                <span
                  key={`${attachment.name}-${index}`}
                  className="flex max-w-45 items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] py-1 pl-2.5 pr-1.5 text-xs font-medium text-[#334155]"
                >
                  <FileIcon className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" />
                  <span className="truncate">{attachment.name}</span>
                  <button
                    type="button"
                    onClick={() => removePendingAttachment(index)}
                    className="shrink-0 rounded-full p-0.5 text-[#94a3b8] transition hover:bg-[#e2e8f0] hover:text-[#334155]"
                    aria-label={`Remove ${attachment.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                handleFilesSelected(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e2e8f0] text-[#64748b] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Attach files"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Write a reply…"
              rows={2}
              className="w-full resize-none rounded-xl border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition focus:border-[#94a3b8] focus:ring-4 focus:ring-[#94a3b8]/15"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || (!message.trim() && pendingAttachments.length === 0)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send reply"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          {attachError && <p className="text-xs text-red-600">{attachError}</p>}
          {sendError && <p className="text-xs text-red-600">{sendError}</p>}
        </div>
      )}
    </div>
  );
}

export function RfiRequestList({ requests }: { requests: RfiRequestSummary[] }) {
  const [selected, setSelected] = useState<RfiRequestSummary | null>(null);
  // Overrides the page-load snapshot once we've fetched a request's live
  // Monday status (opening its thread, or posting a reply from here), so the
  // badge stays accurate for the rest of the session without a full reload.
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

  function getMondayStatus(req: RfiRequestSummary) {
    return statusOverrides[req.id] ?? req.mondayStatus;
  }

  function handleStatusChange(requestId: string, status: string | null) {
    if (!status) return;
    setStatusOverrides((prev) => ({ ...prev, [requestId]: status }));
  }

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
            <StatusBadge mondayStatus={getMondayStatus(req)} syncStatus={req.status} />
            {req.trades.length > 0 && (
              <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-bold text-yellow-700">
                <HardHat className="h-3.5 w-3.5 shrink-0" />
                {req.trades.length} trade{req.trades.length === 1 ? "" : "s"}
              </span>
            )}
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
              <StatusBadge mondayStatus={getMondayStatus(selected)} syncStatus={selected.status} />
              {selected.trades.length > 0 && (
                <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-bold text-yellow-700">
                  <HardHat className="h-3.5 w-3.5 shrink-0" />
                  {selected.trades.length} trade{selected.trades.length === 1 ? "" : "s"}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                Project
              </span>
              <span className="text-sm font-medium text-[#0f172a]">{selected.projectName}</span>
            </div>

            {selected.trades.length > 0 && (
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
            )}

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                Question
              </span>
              <p className="whitespace-pre-wrap text-sm text-[#334155]">{selected.question}</p>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                Assigned To
              </span>
              {selected.assignedPersons.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selected.assignedPersons.map((person) => (
                    <span
                      key={person.id}
                      className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-medium text-[#334155]"
                    >
                      {person.email ? `${person.name} (${person.email})` : person.name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm font-medium text-[#0f172a]">Unassigned</span>
              )}
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

            <RfiAnswers
              key={selected.id}
              requestId={selected.id}
              synced={selected.status === "synced"}
              initialStatus={getMondayStatus(selected)}
              onStatusChange={(status) => handleStatusChange(selected.id, status)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
