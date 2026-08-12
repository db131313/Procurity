"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

/** Hero top bar: logo left + hamburger right at every breakpoint. */
export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/how-it-works", label: "How it works" },
    { href: "/pricing", label: "Pricing" },
    { href: "/login", label: "Log In" },
    { href: "/signup", label: "Find My Opportunities" },
  ];

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
        <Link href="/" aria-label="Procurity home">
          <Logo variant="light" size={28} />
        </Link>
        <button
          type="button"
          className="rounded-full p-2 text-white transition hover:bg-white/10"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-[#0B0F19]/95 px-5 py-5 backdrop-blur-md">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={
                  l.href === "/signup"
                    ? "pc-gradient-bg mt-2 rounded-full px-4 py-3.5 text-center text-sm font-bold text-white"
                    : "rounded-xl px-3 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/5"
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
