"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { PopoverPortal } from "@/components/ui/popover-portal";

export interface MultiSearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

export function MultiSearchableSelect({
  values,
  onChange,
  options,
  placeholder = "Select options",
  searchPlaceholder = "Search...",
  emptyLabel = "No results found",
  itemNounPlural = "items",
}: {
  values: string[];
  onChange: (values: string[]) => void;
  options: MultiSearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  itemNounPlural?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  function toggleValue(value: string) {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  }

  const summary =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? (options.find((o) => o.value === values[0])?.label ?? `1 ${itemNounPlural}`)
        : `${values.length} ${itemNounPlural} selected`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-left text-[#0f172a] outline-none transition focus:border-[#94a3b8] focus:ring-4 focus:ring-[#94a3b8]/15"
      >
        <span className={`truncate ${values.length === 0 ? "text-[#94a3b8]" : ""}`}>
          {summary}
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
            {filtered.map((option) => {
              const checked = values.includes(option.value);
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => toggleValue(option.value)}
                    className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition hover:bg-[#f8fafc] ${
                      checked ? "text-[#0f172a] font-medium" : "text-[#0f172a]"
                    }`}
                  >
                    <span
                      className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border ${
                        checked
                          ? "border-[#0f172a] bg-[#0f172a] text-white"
                          : "border-[#e2e8f0]"
                      }`}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate">
                      {option.label}
                      {option.sublabel && (
                        <span className="ml-1.5 text-xs text-[#94a3b8]">
                          {option.sublabel}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between border-t border-[#e2e8f0] px-4 py-2">
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs font-medium text-[#b91c1c] hover:underline"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-[#f1f5f9] px-3 py-1.5 text-xs font-semibold text-[#334155] transition hover:bg-[#e2e8f0]"
            >
              Done
            </button>
          </div>
        </div>
      </PopoverPortal>
    </div>
  );
}
