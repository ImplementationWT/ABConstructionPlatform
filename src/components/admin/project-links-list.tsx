"use client";

import { useState } from "react";
import { Link2, Loader2, Check, ExternalLink } from "lucide-react";

export interface ProjectLinkRow {
  projectId: string;
  projectName: string;
  status: string;
  tradeFormUrl: string;
}

export function ProjectLinksList({ projects }: { projects: ProjectLinkRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      {projects.map((project) => (
        <ProjectLinkItem key={project.projectId} project={project} />
      ))}
    </div>
  );
}

function ProjectLinkItem({ project }: { project: ProjectLinkRow }) {
  const [url, setUrl] = useState(project.tradeFormUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = url !== project.tradeFormUrl;

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch(`/api/admin/project-links/${project.projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeFormUrl: url.trim(), projectName: project.projectName }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.details?.fieldErrors?.tradeFormUrl?.[0] ?? "Failed to save");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#e2e8f0] bg-white p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#334155]">
          <Link2 className="h-4.5 w-4.5" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-[#0f172a]">{project.projectName}</span>
          <span className="truncate text-xs text-[#94a3b8]">{project.status}</span>
        </div>
      </div>

      <div className="flex flex-1 items-center gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://arzumanbrothers-company.monday.com/boards/..."
          className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-3.5 py-2 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition focus:border-[#94a3b8] focus:ring-4 focus:ring-[#94a3b8]/15"
        />
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open link"
            className="shrink-0 rounded-lg p-2 text-[#64748b] transition hover:bg-[#f8fafc] hover:text-[#334155]"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm font-medium text-[#059669]">
            <Check className="h-4 w-4" />
          </span>
        )}
      </div>
      {error && <p className="text-sm text-[#dc2626] sm:basis-full">{error}</p>}
    </div>
  );
}
