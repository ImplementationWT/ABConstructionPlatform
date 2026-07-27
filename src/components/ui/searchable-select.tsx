"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { PopoverPortal } from "@/components/ui/popover-portal";

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  id,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  emptyLabel = "No results found",
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  id?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.sublabel?.toLowerCase().includes(q)
    );
  }, [query, options]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => searchRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [open]);

  function toggleOpen() {
    setOpen((wasOpen) => {
      if (!wasOpen) setQuery("");
      return !wasOpen;
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-left text-[#0f172a] outline-none transition focus:border-[#94a3b8] focus:ring-4 focus:ring-[#94a3b8]/15"
      >
        <span className={`truncate ${selected ? "" : "text-[#94a3b8]"}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`h-4.5 w-4.5 shrink-0 text-[#94a3b8] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <PopoverPortal
        anchorRef={containerRef}
        panelRef={panelRef}
        open={open}
        className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-lg"
      >
        <div>
          <div className="relative border-b border-[#e2e8f0] p-2">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg bg-[#f8fafc] py-2 pl-9 pr-3 text-sm text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
            />
          </div>

          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-[#94a3b8]">{emptyLabel}</li>
            )}
            {filtered.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm transition hover:bg-[#f8fafc] ${
                    option.value === value
                      ? "bg-[#f1f5f9] font-medium text-[#334155]"
                      : "text-[#0f172a]"
                  }`}
                >
                  <span className="truncate">
                    {option.label}
                    {option.sublabel && (
                      <span className="ml-1.5 text-xs text-[#94a3b8]">
                        {option.sublabel}
                      </span>
                    )}
                  </span>
                  {option.value === value && <Check className="h-4 w-4 shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </PopoverPortal>
    </div>
  );
}
