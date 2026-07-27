import Link from "next/link";
import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { requireAdminSession } from "@/lib/require-admin";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getMondayProjects } from "@/lib/monday";
import { UserList, type AdminUser } from "@/components/admin/user-list";
import { AdminTabs } from "@/components/admin/admin-tabs";

export const metadata: Metadata = {
  title: "Account Management | General Subcontractor Platform",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminSession();

  await connectToDatabase();

  const [usersRaw, projects] = await Promise.all([
    User.find().select("-password").sort({ createdAt: -1 }).lean(),
    getMondayProjects(),
  ]);

  const users: AdminUser[] = usersRaw.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    allowedProjectIds: u.allowedProjectIds ?? [],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-[#0f172a]">Account Management</h1>
          <p className="text-sm text-[#64748b]">
            Create accounts and control which projects each one can access.
          </p>
        </div>
        <Link
          href="/admin/new"
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
        >
          <UserPlus className="h-4.5 w-4.5" />
          New User
        </Link>
      </div>

      <AdminTabs />

      <UserList users={users} projects={projects} />
    </div>
  );
}
