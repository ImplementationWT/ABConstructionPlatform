"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const SIZE_CLASSES = {
  md: "max-w-lg",
  lg: "max-w-3xl",
};

export function Modal({
  open,
  onClose,
  title,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: keyof typeof SIZE_CLASSES;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto p-4 py-10 sm:items-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 bg-black/40"
      />
      <div
        className={`relative flex max-h-[calc(100vh-5rem)] w-full flex-col gap-5 overflow-y-auto rounded-xl bg-white p-5 shadow-2xl sm:p-6 ${SIZE_CLASSES[size]}`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#0f172a]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[#64748b] transition hover:bg-[#f8fafc]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
