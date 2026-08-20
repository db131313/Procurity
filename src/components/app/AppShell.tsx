"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

/**
 * Bottom / side nav: navigate immediately via router.push in a transition.
 * Raised z-index so map BottomSheet / filter backdrops never swallow taps.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isMap = pathname.startsWith("/app/map");

  function go(href: string) {
    // Always navigate — even when "active" — so Home isn't a dead control.
    // loading.tsx provides instant feedback while RSC data loads after arrival.
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <div
      className={
        isMap
          ? "flex h-[100dvh] overflow-hidden bg-offwhite md:flex-row"
          : "min-h-[100dvh] bg-offwhite md:flex"
      }
    >
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white px-4 py-6 md:flex">
        <Logo variant="dark" size={32} />
        <nav className="mt-8 flex flex-col gap-1">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <button
                key={tab.href}
                type="button"
                onClick={() => go(tab.href)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition",
                  active
                    ? "bg-offwhite text-ink"
                    : "text-slate hover:bg-offwhite hover:text-ink",
                  pending && !active && "opacity-70",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-purple")} />
                {tab.label === "More" ? "Settings" : tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div
        className={
          isMap
            ? "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-[calc(64px+var(--safe-bottom))] md:pb-0"
            : "flex min-h-[100dvh] flex-1 flex-col pb-[calc(64px+var(--safe-bottom))] md:pb-0"
        }
      >
        {children}
      </div>

      {/* z-[60]: above map BottomSheet (z-50) and filter scrim (z-40) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "var(--safe-bottom)" }}
        aria-label="Primary"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 pt-1">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <button
                key={tab.href}
                type="button"
                onClick={() => go(tab.href)}
                className={cn(
                  "flex min-h-14 min-w-[64px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold",
                  active ? "text-purple" : "text-slate",
                  pending && !active && "opacity-60",
                )}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Prefetch targets so the first tap is warm */}
      <div className="hidden" aria-hidden>
        {TABS.map((tab) => (
          <Link key={tab.href} href={tab.href} prefetch />
        ))}
      </div>
    </div>
  );
}
