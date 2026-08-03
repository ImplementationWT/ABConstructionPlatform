"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ChevronDown,
  Loader2,
  ShieldCheck,
  User as UserIcon,
  Check,
  Trash2,
  KeyRound,
} from "lucide-react";
import { MultiSearchableSelect } from "@/components/ui/multi-searchable-select";
import { Modal } from "@/components/ui/modal";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  allowedProjectIds: string[];
}

export interface ProjectOption {
  id: string;
  name: string;
  status: string;
}

export function UserList({
  users,
  projects,
}: {
  users: AdminUser[];
  projects: ProjectOption[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const projectOptions = projects.map((project) => ({
    value: project.id,
    label: project.name,
    sublabel: project.status,
  }));

  return (
    <div className="flex flex-col gap-3">
      {users.map((user) => (
        <UserRow
          key={user.id}
          user={user}
          projectOptions={projectOptions}
          isOpen={openId === user.id}
          onToggle={() => setOpenId((prev) => (prev === user.id ? null : user.id))}
        />
      ))}
    </div>
  );
}

function UserRow({
  user,
  projectOptions,
  isOpen,
  onToggle,
}: {
  user: AdminUser;
  projectOptions: { value: string; label: string; sublabel?: string }[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [role, setRole] = useState<"admin" | "user">(user.role);
  const [allowedProjectIds, setAllowedProjectIds] = useState<string[]>(
    user.allowedProjectIds
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const isSelf = session?.user?.id === user.id;

  function closePasswordModal() {
    if (isSavingPassword) return;
    setChangingPassword(false);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
  }

  async function handleChangePassword() {
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setIsSavingPassword(true);
    setPasswordError(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!response.ok) {
        throw new Error("Failed to update password");
      }

      setChangingPassword(false);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordChanged(true);
      setTimeout(() => setPasswordChanged(false), 3000);
    } catch {
      setPasswordError("Something went wrong. Please try again.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, allowedProjectIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      setSaved(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      router.refresh();
    } catch {
      setError("Something went wrong while deleting. Please try again.");
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-[#e2e8f0] bg-white transition hover:shadow-sm">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left sm:px-6"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-[#0f172a]">{user.name}</span>
            <span className="truncate text-sm text-[#64748b]">{user.email}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              user.role === "admin"
                ? "bg-green-50 text-green-700"
                : "bg-yellow-50 text-yellow-700"
            }`}
          >
            {user.role === "admin" ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
              <UserIcon className="h-3.5 w-3.5" />
            )}
            {user.role === "admin" ? "Admin" : "User"}
          </span>
          {user.role !== "admin" && (
            <span className="hidden text-xs text-[#94a3b8] sm:inline">
              {user.allowedProjectIds.length} project
              {user.allowedProjectIds.length === 1 ? "" : "s"}
            </span>
          )}
          <ChevronDown
            className={`h-4.5 w-4.5 text-[#64748b] transition-transform duration-300 ease-in-out ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div
            inert={!isOpen}
            className="flex flex-col gap-4 border-t border-[#e2e8f0] px-5 pb-5 pt-4 sm:px-6 sm:pb-6"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#334155]">Role</label>
                <div className="flex gap-2">
                  {(["user", "admin"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium capitalize transition ${
                        role === r
                          ? "border-[#0f172a] bg-[#f1f5f9] text-[#0f172a]"
                          : "border-[#e2e8f0] text-[#334155] hover:bg-[#f8fafc]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#334155]">
                  Assigned Projects
                </label>
                {role === "admin" ? (
                  <p className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5 text-sm text-[#64748b]">
                    Admins have access to all projects
                  </p>
                ) : (
                  <MultiSearchableSelect
                    values={allowedProjectIds}
                    onChange={setAllowedProjectIds}
                    options={projectOptions}
                    placeholder="No projects assigned"
                    searchPlaceholder="Search project..."
                    emptyLabel="No projects found"
                    itemNounPlural="projects"
                  />
                )}
              </div>
            </div>

            {error && <p className="text-sm text-[#dc2626]">{error}</p>}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
                {saved && !isSaving && (
                  <span className="flex items-center gap-1 text-sm font-medium text-[#059669]">
                    <Check className="h-4 w-4" />
                    Saved
                  </span>
                )}
                {passwordChanged && (
                  <span className="flex items-center gap-1 text-sm font-medium text-[#059669]">
                    <Check className="h-4 w-4" />
                    Password updated
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChangingPassword(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] px-3 py-2 text-sm font-medium text-[#334155] transition hover:-translate-y-0.5 hover:bg-[#f8fafc] hover:shadow-md"
                >
                  <KeyRound className="h-4 w-4" />
                  Change Password
                </button>

                {!isSelf && (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-[#dc2626] px-3 py-2 text-sm font-medium text-[#dc2626] transition hover:-translate-y-0.5 hover:bg-[#dc2626] hover:text-white hover:shadow-md"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete User
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={confirmingDelete}
        onClose={() => {
          if (!isDeleting) setConfirmingDelete(false);
        }}
        title="Delete User"
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-[#334155]">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-[#0f172a]">{user.name}</span>? This
            action cannot be undone.
          </p>

          {error && <p className="text-sm text-[#dc2626]">{error}</p>}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={isDeleting}
              className="rounded-xl border border-[#e2e8f0] px-3 py-1.5 text-sm font-medium text-[#334155] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 rounded-xl bg-[#dc2626] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={changingPassword}
        onClose={closePasswordModal}
        title="Change Password"
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-[#334155]">
            Set a new password for{" "}
            <span className="font-semibold text-[#0f172a]">{user.name}</span>. They
            will need to use it the next time they sign in.
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#334155]">
                New Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError(null);
                }}
                className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-sm text-[#0f172a] outline-none transition focus:border-[#0f172a]"
                placeholder="At least 8 characters"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#334155]">
                Confirm Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError(null);
                }}
                className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-sm text-[#0f172a] outline-none transition focus:border-[#0f172a]"
                placeholder="Re-enter the new password"
              />
            </div>
          </div>

          {passwordError && <p className="text-sm text-[#dc2626]">{passwordError}</p>}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closePasswordModal}
              disabled={isSavingPassword}
              className="rounded-xl border border-[#e2e8f0] px-3 py-1.5 text-sm font-medium text-[#334155] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={isSavingPassword}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSavingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
