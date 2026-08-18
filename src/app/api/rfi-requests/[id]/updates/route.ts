import { NextRequest, NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { RfiRequest } from "@/models/RfiRequest";
import { userCanAccessProject } from "@/lib/get-project-filter";
import { createRfiRequestUpdate, getRfiRequestUpdates, setRfiRequestStatus } from "@/lib/monday";
import { rfiUpdateReplySchema } from "@/lib/validation/rfi-request";

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
    return NextResponse.json({ updates: [], status: null });
  }

  try {
    const thread = await getRfiRequestUpdates(rfiRequest.mondayItemId);
    return NextResponse.json(thread);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch updates from Monday" },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = rfiUpdateReplySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid message", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id } = await params;

  await connectToDatabase();

  const rfiRequest = await RfiRequest.findById(id).lean();

  if (!rfiRequest || !(await userCanAccessProject(session.user.id, rfiRequest.projectId))) {
    return NextResponse.json({ error: "RFI request not found" }, { status: 404 });
  }

  const mondayItemId = rfiRequest.mondayItemId;
  if (!mondayItemId) {
    return NextResponse.json(
      { error: "This request has not synced to Monday yet." },
      { status: 400 }
    );
  }

  try {
    const update = await createRfiRequestUpdate(
      mondayItemId,
      session.user.name ?? session.user.email ?? "Unknown",
      parsed.data.message,
      parsed.data.attachments
    );

    // Don't make the user wait on this: change the status in the background
    // after the response is sent, giving Monday a moment to settle after the
    // update is created before changing the status, to avoid racing its own
    // async processing.
    after(async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await setRfiRequestStatus(mondayItemId, "Pending");
      } catch (error) {
        console.error("Failed to set RFI request status to Pending:", error);
      }
    });

    return NextResponse.json({ update, status: "Pending" }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to post your reply to Monday" },
      { status: 502 }
    );
  }
}
