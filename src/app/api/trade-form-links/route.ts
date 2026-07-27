import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ProjectLink } from "@/models/ProjectLink";
import { getAccessibleProjects } from "@/lib/get-accessible-projects";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessibleProjects = await getAccessibleProjects(session.user.id);

  await connectToDatabase();

  const links = await ProjectLink.find({
    projectId: { $in: accessibleProjects.map((project) => project.id) },
  }).lean();

  const linksByProjectId = new Map(links.map((link) => [link.projectId, link.tradeFormUrl]));

  const projects = accessibleProjects.map((project) => ({
    id: project.id,
    name: project.name,
    tradeFormUrl: linksByProjectId.get(project.id) ?? "",
  }));

  return NextResponse.json({ projects });
}
