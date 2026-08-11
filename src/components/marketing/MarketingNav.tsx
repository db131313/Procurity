"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/how-it-works", label: "How it works" },
    { href: "/pricing", label: "Pricing" },
    { href: "/login", label: "Log In" },
  ];

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
        <Link href="/" aria-label="Procurity home">
          <Logo variant="gradient" size={34} />
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-semibold text-white/80 transition hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/signup"
            className="pc-gradient-bg rounded-full px-4 py-2.5 text-sm font-bold text-white"
          >
            Start Free Trial
          </Link>
        </nav>
        <button
          type="button"
          className="rounded-full p-2 text-white md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-ink/95 px-5 py-4 backdrop-blur md:hidden">
          <div className="flex flex-col gap-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/signup"
              className="pc-gradient-bg mt-1 rounded-full px-4 py-3 text-center text-sm font-bold text-white"
              onClick={() => setOpen(false)}
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
