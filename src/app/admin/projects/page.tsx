import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/require-admin";
import { connectToDatabase } from "@/lib/mongodb";
import { ProjectLink } from "@/models/ProjectLink";
import { getMondayProjects } from "@/lib/monday";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { ProjectLinksList, type ProjectLinkRow } from "@/components/admin/project-links-list";

export const metadata: Metadata = {
  title: "Projects | General Subcontractor Platform",
};

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  await requireAdminSession();

  await connectToDatabase();

  const [mondayProjects, links] = await Promise.all([
    getMondayProjects(),
    ProjectLink.find().lean(),
  ]);

  const linksByProjectId = new Map(links.map((link) => [link.projectId, link.tradeFormUrl]));

  const projects: ProjectLinkRow[] = mondayProjects.map((project) => ({
    projectId: project.id,
    projectName: project.name,
    status: project.status,
    tradeFormUrl: linksByProjectId.get(project.id) ?? "",
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-[#0f172a]">Projects</h1>
        <p className="text-sm text-[#64748b]">
          Set the shareable Monday Trade Form board link for each project.
        </p>
      </div>

      <AdminTabs />

      <ProjectLinksList projects={projects} />
    </div>
  );
}
