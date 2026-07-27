import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { requireAdminSession } from "@/lib/require-admin";
import { getMondayProjects } from "@/lib/monday";
import { CreateUserForm } from "@/components/admin/create-user-form";

export const metadata: Metadata = {
  title: "New User | General Subcontractor Platform",
};

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  await requireAdminSession();

  const projects = await getMondayProjects();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin"
        className="flex w-fit items-center gap-2 text-sm font-medium text-[#64748b] transition hover:text-[#334155]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Account Management
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-[#0f172a]">New User</h1>
        <p className="text-sm text-[#64748b]">
          Create an account and choose which projects it can access.
        </p>
      </div>

      <CreateUserForm projects={projects} />
    </div>
  );
}
