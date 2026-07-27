"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

export function PopoverPortal({
  anchorRef,
  open,
  panelRef,
  className,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  panelRef?: RefObject<HTMLDivElement | null>;
  className?: string;
  children: React.ReactNode;
}) {
  const [style, setStyle] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    function updatePosition() {
      const rect = anchorRef.current!.getBoundingClientRect();
      setStyle({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, anchorRef]);

  if (!open || !style || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: style.top,
        left: style.left,
        width: style.width,
        zIndex: 300,
      }}
      className={className}
    >
      {children}
    </div>,
    document.body
  );
}
