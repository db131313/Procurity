"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

/** Hero top bar: logo left + hamburger right at every breakpoint. */
export function MarketingNav({
  variant = "dark",
}: {
  variant?: "dark" | "light";
}) {
  const [open, setOpen] = useState(false);
  const light = variant === "light";
  const links = [
    { href: "/demo", label: "Demo" },
    { href: "/how-it-works", label: "How it works" },
    { href: "/pricing", label: "Pricing" },
    { href: "/login", label: "Log in" },
    { href: "/signup", label: "Start free trial" },
  ];

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="flex w-full items-center justify-between px-5 py-4 md:pl-12 md:pr-8">
        <Link href="/" aria-label="Procurity home">
          <Logo variant={light ? "dark" : "light"} size={28} />
        </Link>
        <button
          type="button"
          className={cn(
            "rounded-full p-2 transition",
            light
              ? "text-ink hover:bg-slate/10"
              : "text-white hover:bg-white/10",
          )}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div
          className={cn(
            "border-t px-5 py-5 md:px-12",
            light
              ? "border-line bg-white/95 backdrop-blur-md"
              : "border-white/10 bg-[#0B0F19]/95 backdrop-blur-md",
          )}
        >
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={
                  l.href === "/signup"
                    ? "mt-2 rounded-full bg-[#2563EB] px-4 py-3.5 text-center text-sm font-bold text-white"
                    : cn(
                        "rounded-xl px-3 py-3 text-sm font-semibold transition",
                        light
                          ? "text-ink hover:bg-slate/5"
                          : "text-white/90 hover:bg-white/5",
                      )
                }
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
