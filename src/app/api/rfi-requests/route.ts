import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { RfiRequest } from "@/models/RfiRequest";
import { rfiRequestSchema } from "@/lib/validation/rfi-request";
import { createRfiRequestMondayItem, uploadRfiAttachment } from "@/lib/monday";
import { getProjectAccessFilter, userCanAccessProject } from "@/lib/get-project-filter";
import { uploadPhotoToS3 } from "@/lib/s3";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const filter = await getProjectAccessFilter(session.user.id);

  const requests = await RfiRequest.find(filter)
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
  const parsed = rfiRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid RFI request data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!(await userCanAccessProject(session.user.id, parsed.data.projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();

  // Keep the original (base64) attachments around for the Monday file upload below,
  // and persist the request in MongoDB with public S3 URLs instead of base64.
  const originalAttachments = parsed.data.attachments;

  let attachmentsWithS3Urls;
  try {
    attachmentsWithS3Urls = await Promise.all(
      originalAttachments.map(async (attachment) => ({
        url: await uploadPhotoToS3(attachment.url, attachment.name, "rfi-requests"),
        name: attachment.name,
      }))
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to upload attachments. Please try again." },
      { status: 502 }
    );
  }

  const rfiRequest = await RfiRequest.create({
    projectId: parsed.data.projectId,
    projectName: parsed.data.projectName,
    subject: parsed.data.subject,
    question: parsed.data.question,
    trades: parsed.data.trades,
    attachments: attachmentsWithS3Urls,
    assignedPersons: parsed.data.assignedPersons,
    createdBy: session.user.id,
  });

  try {
    const mondayItemId = await createRfiRequestMondayItem({
      projectId: rfiRequest.projectId,
      projectName: rfiRequest.projectName,
      subject: rfiRequest.subject,
      question: rfiRequest.question,
      trades: rfiRequest.trades,
      reporterEmail: session.user.email ?? "",
      mongoId: rfiRequest._id.toString(),
      assignedPersonIds: rfiRequest.assignedPersons.map((p: { id: string }) => p.id),
    });

    for (const attachment of originalAttachments) {
      await uploadRfiAttachment(mondayItemId, attachment.url, attachment.name);
    }

    rfiRequest.mondayItemId = mondayItemId;
    rfiRequest.status = "synced";
    await rfiRequest.save();
  } catch (error) {
    rfiRequest.status = "sync_failed";
    rfiRequest.syncError = error instanceof Error ? error.message : "Unknown sync error";
    await rfiRequest.save();
  }

  return NextResponse.json({ rfiRequest }, { status: 201 });
}
