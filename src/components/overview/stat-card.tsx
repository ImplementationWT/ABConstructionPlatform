import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  onClick?: () => void;
}) {
  const Container = onClick ? "button" : "div";

  return (
    <Container
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`group flex w-full items-start justify-between gap-3 overflow-hidden rounded-xl border border-[#e2e8f0] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        onClick ? "cursor-pointer hover:border-gray-300" : ""
      }`}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-semibold text-[#64748b]">{label}</span>
        <span className="text-3xl font-bold text-[#0f172a]">{value}</span>
        {sublabel && <span className="truncate text-xs text-[#94a3b8]">{sublabel}</span>}
      </div>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-600 transition group-hover:scale-105">
        <Icon className="h-5 w-5" />
      </div>
    </Container>
  );
}
