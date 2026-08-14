import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { RfiRequest } from "@/models/RfiRequest";
import { userCanAccessProject } from "@/lib/get-project-filter";
import { createRfiRequestUpdate, getRfiRequestUpdates } from "@/lib/monday";
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

  if (!rfiRequest.mondayItemId) {
    return NextResponse.json(
      { error: "This request has not synced to Monday yet." },
      { status: 400 }
    );
  }

  try {
    const update = await createRfiRequestUpdate(
      rfiRequest.mondayItemId,
      session.user.name ?? session.user.email ?? "Unknown",
      parsed.data.message,
      parsed.data.attachments
    );
    return NextResponse.json({ update }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to post your reply to Monday" },
      { status: 502 }
    );
  }
}
