"use client";

import Link from "next/link";
import { HomeVideoBand } from "./HomeVideoBand";
import { PricingCards } from "./PricingCards";

const STEPS = [
  {
    n: "01",
    title: "See what's about to be built",
    body: "A live national map of commercial sites, scored by how ready they are to buy.",
  },
  {
    n: "02",
    title: "Know who to call and why now",
    body: "Open a project for the street view, score reasons, and the right moment to reach out.",
  },
  {
    n: "03",
    title: "Measure, quote, and get paid",
    body: "Take the job from the map to a deposit in one workflow — no tool-juggling.",
  },
] as const;

export function HomeBelowBw() {
  return (
    <div className="relative bg-black text-white">
      <HomeVideoBand />

      <section
        id="how-it-works"
        className="border-t border-white/10 px-5 py-16 md:px-10 md:py-24"
      >
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-3 md:gap-10">
          {STEPS.map((s) => (
            <div key={s.n}>
              <p className="text-xs font-medium tabular-nums text-neutral-500">
                {s.n}
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="pricing"
        className="border-t border-white/10 px-5 py-16 md:px-10 md:py-24"
      >
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">
            Simple pricing
          </h2>
          <p className="mx-auto mt-2 max-w-md text-center text-neutral-400">
            Start free. Upgrade when your coverage grows.
          </p>
          <div className="mt-10">
            <PricingCards variant="bw" />
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-20 md:px-10 md:py-28">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Know which projects are about to need you.
          </h2>
          <p className="mt-4 max-w-lg text-neutral-400">
            Commercial builds near you, scored by how soon they will buy — then
            measure, quote, and get paid in one place.
          </p>
          <Link
            href="/signup"
            className="bw-btn-primary pc-press mt-8 h-12 px-8 text-sm"
          >
            Start free
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 md:px-10">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 text-sm text-neutral-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Procurity</p>
          <nav className="flex flex-wrap gap-4">
            <Link href="#how-it-works" className="hover:text-white">
              How it works
            </Link>
            <Link href="#pricing" className="hover:text-white">
              Pricing
            </Link>
            <Link href="/login" className="hover:text-white">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-white">
              Start free
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
