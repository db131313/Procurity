import { cn } from "@/lib/cn";
import { Check, Circle, Loader } from "lucide-react";

type Status = "confirmed" | "pending" | "missing";

const config: Record<
  Status,
  { icon: typeof Check; className: string; label: string }
> = {
  confirmed: {
    icon: Check,
    className: "bg-emerald-50 text-emerald-700",
    label: "Confirmed",
  },
  pending: {
    icon: Loader,
    className: "bg-amber-50 text-amber-700",
    label: "In progress",
  },
  missing: {
    icon: Circle,
    className: "bg-slate-100 text-slate-500",
    label: "Not detected",
  },
};

export function StatusChip({
  status,
  children,
}: {
  status: Status;
  children: React.ReactNode;
}) {
  const c = config[status];
  const Icon = c.icon;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold",
        c.className,
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className="flex-1">{children}</span>
      <span className="text-[11px] font-bold uppercase tracking-wide opacity-70">
        {c.label}
      </span>
    </div>
  );
}
