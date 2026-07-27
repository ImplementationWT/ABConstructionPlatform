"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  InspectionRequestForm,
  type ProjectOption,
} from "@/components/inspection-requests/inspection-request-form";

export function NewInspectionRequestButton({ projects }: { projects: ProjectOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
      >
        <Plus className="h-4.5 w-4.5" />
        New Request
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="New Inspection Request">
        <InspectionRequestForm
          projects={projects}
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
