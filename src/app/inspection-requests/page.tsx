import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { getAccessibleProjects } from "@/lib/get-accessible-projects";
import { getProjectAccessFilter } from "@/lib/get-project-filter";
import { InspectionRequest } from "@/models/InspectionRequest";
import {
  InspectionRequestList,
  type InspectionRequestSummary,
} from "@/components/inspection-requests/inspection-requests-section";
import { NewInspectionRequestButton } from "@/components/inspection-requests/new-inspection-request-button";

export const metadata: Metadata = {
  title: "Inspection Requests | General Subcontractor Platform",
};

export const dynamic = "force-dynamic";

export default async function InspectionRequestsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  await connectToDatabase();

  const [accessibleProjects, requestsRaw] = await Promise.all([
    getAccessibleProjects(session.user.id),
    getProjectAccessFilter(session.user.id).then((filter) =>
      InspectionRequest.find(filter).sort({ createdAt: -1 }).limit(200).lean()
    ),
  ]);

  const requests: InspectionRequestSummary[] = requestsRaw.map((r) => ({
    id: r._id.toString(),
    projectName: r.projectName,
    trades: r.trades,
    startDate: new Date(r.startDate).toISOString(),
    endDate: new Date(r.endDate).toISOString(),
    details: r.details,
    status: r.status,
  }));

  const projectOptions = accessibleProjects.map((project) => ({
    id: project.id,
    name: project.name,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold text-[#0f172a]">Inspection Requests</h1>
          <p className="text-sm text-[#64748b]">
            Request QC inspections for your projects and track their status.
          </p>
        </div>
        <NewInspectionRequestButton projects={projectOptions} />
      </div>

      <InspectionRequestList requests={requests} />
    </div>
  );
}
