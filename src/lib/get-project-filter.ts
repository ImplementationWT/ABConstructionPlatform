import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";

/**
 * Returns a Mongo query filter that scopes project-linked documents
 * (DailyReport, InspectionRequest) to what the given user is allowed to see.
 * Admins get an empty filter (no restriction); regular users are limited to
 * their assigned project IDs.
 */
export async function getProjectAccessFilter(
  userId: string
): Promise<Record<string, unknown>> {
  await connectToDatabase();

  const user = await User.findById(userId).lean();

  if (user?.role === "admin") {
    return {};
  }

  return { projectId: { $in: user?.allowedProjectIds ?? [] } };
}

export async function userCanAccessProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  await connectToDatabase();

  const user = await User.findById(userId).lean();

  if (user?.role === "admin") {
    return true;
  }

  return Boolean(user?.allowedProjectIds?.includes(projectId));
}
