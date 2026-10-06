"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { EditReportForm, type EditableReport } from "@/components/reports/edit-report-form";

export function EditDailyReportButton({ report }: { report: EditableReport }) {
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
        className="flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] px-3 py-1.5 text-sm font-medium text-[#334155] transition hover:bg-[#f8fafc]"
      >
        <Pencil className="h-4 w-4" />
        Edit
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Edit Daily Report" size="lg">
        <EditReportForm
          report={report}
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
