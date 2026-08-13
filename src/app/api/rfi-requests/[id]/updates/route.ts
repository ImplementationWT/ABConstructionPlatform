import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { RfiRequest } from "@/models/RfiRequest";
import { userCanAccessProject } from "@/lib/get-project-filter";
import { getRfiRequestUpdates } from "@/lib/monday";

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

  const rfiRequest = await RfiRequest.findById(id).lean();

  if (!rfiRequest || !(await userCanAccessProject(session.user.id, rfiRequest.projectId))) {
    return NextResponse.json({ error: "RFI request not found" }, { status: 404 });
  }

  if (!rfiRequest.mondayItemId) {
    return NextResponse.json({ updates: [] });
  }

  try {
    const updates = await getRfiRequestUpdates(rfiRequest.mondayItemId);
    return NextResponse.json({ updates });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch updates from Monday" },
      { status: 502 }
    );
  }
}
