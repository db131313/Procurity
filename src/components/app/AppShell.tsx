"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Home,
  Map,
  MoreHorizontal,
  Kanban,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/brand/Logo";

const TABS = [
  { href: "/app/home", label: "Home", icon: Home },
  { href: "/app/map", label: "Map", icon: Map },
  { href: "/app/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/app/alerts", label: "Alerts", icon: Bell },
  { href: "/app/settings", label: "More", icon: MoreHorizontal },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-[100dvh] bg-offwhite md:flex">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white px-4 py-6 md:flex">
        <Logo variant="dark" size={32} />
        <nav className="mt-8 flex flex-col gap-1">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  active
                    ? "bg-offwhite text-ink"
                    : "text-slate hover:bg-offwhite hover:text-ink",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-purple")} />
                {tab.label === "More" ? "Settings" : tab.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-[100dvh] flex-1 flex-col pb-[calc(64px+var(--safe-bottom))] md:pb-0">
        {children}
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "var(--safe-bottom)" }}
        aria-label="Primary"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 pt-1">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex min-h-14 min-w-[64px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold",
                  active ? "text-purple" : "text-slate",
                )}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
