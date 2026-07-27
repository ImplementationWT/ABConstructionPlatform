"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";

interface TradeFormProject {
  id: string;
  name: string;
  tradeFormUrl: string;
}

export function TradeFormNavButton({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<TradeFormProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    onNavigate?.();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/trade-form-links");
      if (!response.ok) throw new Error("Failed to load");

      const data: { projects: TradeFormProject[] } = await response.json();
      const withLinks = data.projects.filter((project) => project.tradeFormUrl);

      if (withLinks.length === 1) {
        window.open(withLinks[0].tradeFormUrl, "_blank", "noopener,noreferrer");
        return;
      }

      setProjects(data.projects);
      setOpen(true);
    } catch {
      setProjects([]);
      setError("Something went wrong loading your projects.");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-[#334155] transition hover:bg-white disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4.5 w-4.5 animate-spin" />
        ) : (
          <ExternalLink className="h-4.5 w-4.5" />
        )}
        Trade Form
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Select a Project">
        <div className="flex flex-col gap-2">
          {error && <p className="text-sm text-[#dc2626]">{error}</p>}

          {!error && projects?.length === 0 && (
            <p className="text-sm text-[#64748b]">
              No projects are assigned to your account yet. Contact your admin.
            </p>
          )}

          {!error &&
            projects?.map((project) =>
              project.tradeFormUrl ? (
                <a
                  key={project.id}
                  href={project.tradeFormUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium text-[#0f172a] transition hover:border-gray-300 hover:bg-[#f8fafc]"
                >
                  {project.name}
                  <ExternalLink className="h-4 w-4 shrink-0 text-[#94a3b8]" />
                </a>
              ) : (
                <div
                  key={project.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#e2e8f0] px-4 py-3 text-sm text-[#94a3b8]"
                >
                  {project.name}
                  <span className="text-xs">No link set</span>
                </div>
              )
            )}
        </div>
      </Modal>
    </>
  );
}
