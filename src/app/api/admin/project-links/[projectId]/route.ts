import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ProjectLink } from "@/models/ProjectLink";
import { projectLinkSchema } from "@/lib/validation/project-link";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { projectId } = await params;
  const body = await request.json();
  const parsed = projectLinkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const projectName = typeof body.projectName === "string" ? body.projectName : "";

  await connectToDatabase();

  const link = await ProjectLink.findOneAndUpdate(
    { projectId },
    {
      $set: {
        projectName,
        tradeFormUrl: parsed.data.tradeFormUrl,
        updatedBy: session.user.id,
      },
    },
    { new: true, upsert: true }
  );

  return NextResponse.json({ link });
}
