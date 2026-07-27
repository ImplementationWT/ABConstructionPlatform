import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { InspectionRequest } from "@/models/InspectionRequest";
import { inspectionRequestSchema } from "@/lib/validation/inspection-request";
import { createInspectionRequestMondayItem } from "@/lib/monday";
import { getProjectAccessFilter, userCanAccessProject } from "@/lib/get-project-filter";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const filter = await getProjectAccessFilter(session.user.id);

  const requests = await InspectionRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("createdBy", "name email")
    .lean();

  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = inspectionRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid inspection request data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!(await userCanAccessProject(session.user.id, parsed.data.projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();

  const inspectionRequest = await InspectionRequest.create({
    projectId: parsed.data.projectId,
    projectName: parsed.data.projectName,
    trades: parsed.data.trades,
    startDate: new Date(parsed.data.startDate),
    endDate: new Date(parsed.data.endDate),
    details: parsed.data.details,
    createdBy: session.user.id,
  });

  try {
    const mondayItemId = await createInspectionRequestMondayItem({
      projectName: inspectionRequest.projectName,
      trades: inspectionRequest.trades,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      details: inspectionRequest.details,
      reporterEmail: session.user.email ?? "",
      mongoId: inspectionRequest._id.toString(),
    });

    inspectionRequest.mondayItemId = mondayItemId;
    inspectionRequest.status = "synced";
    await inspectionRequest.save();
  } catch (error) {
    inspectionRequest.status = "sync_failed";
    inspectionRequest.syncError = error instanceof Error ? error.message : "Unknown sync error";
    await inspectionRequest.save();
  }

  return NextResponse.json({ inspectionRequest }, { status: 201 });
}
