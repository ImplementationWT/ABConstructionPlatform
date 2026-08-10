"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  ClipboardList,
  ClipboardCheck,
  FileQuestion,
  ShieldCheck,
  Receipt,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { TradeFormNavButton } from "@/components/layout/trade-form-nav-button";

const NAV_ITEMS = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/daily-reports", label: "Daily Reports", icon: ClipboardList },
  { href: "/inspection-requests", label: "AB Inspection Requests", icon: ClipboardCheck },
  { href: "/rfi-requests", label: "RFI Request", icon: FileQuestion },
];

const ADMIN_NAV_ITEM = { href: "/admin", label: "Admin", icon: ShieldCheck };

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const initials = (session?.user?.name ?? session?.user?.email ?? "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      {/* Sidebar (static on desktop, drawer on mobile/tablet) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#e2e8f0] bg-[#f8fafc] transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 pt-7 pb-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Company logo"
              width={60}
              height={60}
              className="shrink-0"
            />
            <div className="flex flex-col">
              {/*<span className="text-xs font-medium uppercase tracking-wide text-[#334155]">
                Subcontractor Platform
              </span> */}
              <span className="text-md font-bold text-[#0f172a]">
                Construction Platform
              </span>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f1f5f9] lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-4 py-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition ${
                  isActive
                    ? "bg-[#f1f5f9] font-bold text-[#0f172a]"
                    : "font-medium text-[#334155] hover:bg-white"
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                {item.label}
              </Link>
            );
          })}

          <TradeFormNavButton onNavigate={() => setDrawerOpen(false)} />

          <div
            aria-disabled="true"
            title="Coming soon"
            className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#94a3b8]"
          >
            <Receipt className="h-4.5 w-4.5" />
            Invoice
            <span className="ml-auto rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
              Soon
            </span>
          </div>

          {isAdmin && (
            <Link
              href={ADMIN_NAV_ITEM.href}
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition ${
                pathname === ADMIN_NAV_ITEM.href || pathname?.startsWith(`${ADMIN_NAV_ITEM.href}/`)
                  ? "bg-[#f1f5f9] font-bold text-[#0f172a]"
                  : "font-medium text-[#334155] hover:bg-white"
              }`}
            >
              <ADMIN_NAV_ITEM.icon className="h-4.5 w-4.5" />
              {ADMIN_NAV_ITEM.label}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3 border-t border-[#e2e8f0] px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-[#0f172a]">
              {session?.user?.name ?? "User"}
            </span>
            <span className="truncate text-xs text-[#64748b]">
              {session?.user?.email}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label="Sign out"
            className="rounded-lg p-2 text-[#64748b] transition hover:bg-[#f1f5f9] hover:text-[#334155]"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#e2e8f0] bg-white/90 px-4 py-3.5 backdrop-blur sm:px-6 lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-[#334155] hover:bg-[#f1f5f9]"
            aria-label="Open menu"
          >
            <Menu className="h-5.5 w-5.5" />
          </button>
          <span className="text-base font-semibold text-[#0f172a]">
            General Subcontractor Platform
          </span>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
