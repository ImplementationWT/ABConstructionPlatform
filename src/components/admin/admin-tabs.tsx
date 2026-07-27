"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Users" },
  { href: "/admin/projects", label: "Projects" },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="flex w-fit gap-1 rounded-xl border border-[#e2e8f0] bg-white p-1">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
              isActive
                ? "bg-[#f1f5f9] text-[#334155]"
                : "text-[#334155] hover:bg-[#f8fafc]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
