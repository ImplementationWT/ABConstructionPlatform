import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { DailyReport } from "@/models/DailyReport";
import { userCanAccessProject } from "@/lib/get-project-filter";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await connectToDatabase();

  const report = await DailyReport.findById(id)
    .populate("createdBy", "name email")
    .lean();

  if (!report || !(await userCanAccessProject(session.user.id, report.projectId))) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({ report });
}
