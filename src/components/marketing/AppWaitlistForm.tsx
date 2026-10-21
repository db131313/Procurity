"use client";

import { useState } from "react";
import { WorkingSpinner } from "@/components/ui/WorkingIndicator";

export function AppWaitlistForm({ source = "home" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/app-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
      };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Something went wrong");
        return;
      }
      setStatus("ok");
      setMessage("You're on the list — we'll email you.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Something went wrong");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <label className="sr-only" htmlFor="app-waitlist-email">
        Email
      </label>
      <input
        id="app-waitlist-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="h-11 flex-1 rounded-full border border-line bg-white px-4 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563EB]"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="brand-gradient inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-bold text-white disabled:opacity-60"
      >
        {status === "loading" ? <WorkingSpinner /> : "Notify me"}
      </button>
      {message && (
        <p
          className={`text-xs sm:basis-full ${status === "error" ? "text-red-600" : "text-slate"}`}
          role="status"
        >
          {message}
        </p>
      )}
    </form>
  );
}
