import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { getAccessibleProjects } from "@/lib/get-accessible-projects";
import { getProjectAccessFilter } from "@/lib/get-project-filter";
import { getMondayAccountUsers, getRfiRequestStatuses } from "@/lib/monday";
import { RfiRequest } from "@/models/RfiRequest";
import type { IPhoto } from "@/models/DailyReport";
import {
  RfiRequestList,
  type RfiRequestSummary,
} from "@/components/rfi-requests/rfi-requests-section";
import { NewRfiRequestButton } from "@/components/rfi-requests/new-rfi-request-button";

export const metadata: Metadata = {
  title: "RFI Requests | General Subcontractor Platform",
};

export const dynamic = "force-dynamic";

export default async function RfiRequestsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  await connectToDatabase();

  const [accessibleProjects, requestsRaw, assignableUsers] = await Promise.all([
    getAccessibleProjects(session.user.id),
    getProjectAccessFilter(session.user.id).then((filter) =>
      RfiRequest.find(filter).sort({ createdAt: -1 }).limit(200).lean()
    ),
    getMondayAccountUsers(),
  ]);

  const syncedItemIds = requestsRaw
    .filter((r): r is typeof r & { mondayItemId: string } => r.status === "synced" && !!r.mondayItemId)
    .map((r) => r.mondayItemId);

  const statusMap = await getRfiRequestStatuses(syncedItemIds);

  const requests: RfiRequestSummary[] = requestsRaw.map((r) => ({
    id: r._id.toString(),
    projectName: r.projectName,
    subject: r.subject,
    question: r.question,
    trades: r.trades,
    attachments: (r.attachments ?? []).map((a: IPhoto) => ({ url: a.url, name: a.name })),
    assignedPersons: r.assignedPersons ?? [],
    status: r.status,
    mondayStatus: r.mondayItemId ? statusMap[r.mondayItemId] : undefined,
  }));

  const projectOptions = accessibleProjects.map((project) => ({
    id: project.id,
    name: project.name,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold text-[#0f172a]">RFI Request</h1>
          <p className="text-sm text-[#64748b]">
            Submit requests for information for your projects and track their status.
          </p>
        </div>
        <NewRfiRequestButton projects={projectOptions} assignableUsers={assignableUsers} />
      </div>

      <RfiRequestList requests={requests} />
    </div>
  );
}
