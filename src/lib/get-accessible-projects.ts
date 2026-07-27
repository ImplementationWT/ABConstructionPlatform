import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getMondayProjects, type MondayProject } from "@/lib/monday";

export async function getAccessibleProjects(userId: string): Promise<MondayProject[]> {
  await connectToDatabase();

  const [currentUser, mondayProjects] = await Promise.all([
    User.findById(userId).lean(),
    getMondayProjects(),
  ]);

  if (currentUser?.role === "admin") {
    return mondayProjects;
  }

  return mondayProjects.filter((project) =>
    currentUser?.allowedProjectIds?.includes(project.id)
  );
}
