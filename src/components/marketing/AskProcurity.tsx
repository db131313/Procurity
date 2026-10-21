"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  ASK_SUGGESTIONS,
  parseAskQuery,
  type AskIntent,
  type AskResult,
} from "@/lib/marketing/ask-procurity";
import { cn } from "@/lib/cn";

type Props = {
  onApply: (intent: AskIntent) => { resultLine: string };
  className?: string;
};

export function AskProcurity({ onApply, className }: Props) {
  const [query, setQuery] = useState("");
  const [looking, setLooking] = useState(false);
  const [lookText, setLookText] = useState("");
  const [resultLine, setResultLine] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (typeRef.current) clearInterval(typeRef.current);
    };
  }, []);

  function runLookingThen(apply: () => void) {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (typeRef.current) clearInterval(typeRef.current);

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      apply();
      return;
    }

    setLooking(true);
    setResultLine(null);
    setHint(null);
    const full = "Looking…";
    setLookText("");
    let i = 0;
    typeRef.current = setInterval(() => {
      i += 1;
      setLookText(full.slice(0, i));
      if (i >= full.length && typeRef.current) {
        clearInterval(typeRef.current);
        typeRef.current = null;
      }
    }, 40);

    timerRef.current = setTimeout(() => {
      if (typeRef.current) clearInterval(typeRef.current);
      setLooking(false);
      setLookText("");
      apply();
    }, 480);
  }

  function handleResult(parsed: AskResult) {
    if (!parsed.ok || !parsed.intent) {
      setHint(
        parsed.message ||
          "I can filter by type, city, score and size. Try one of these.",
      );
      setResultLine(null);
      return;
    }
    const { resultLine: line } = onApply(parsed.intent);
    setHint(null);
    setResultLine(line);
  }

  function submit(raw: string) {
    const text = raw.trim();
    if (!text) return;
    runLookingThen(() => handleResult(parseAskQuery(text)));
  }

  function pickSuggestion(intent: AskIntent) {
    setQuery(intent.label);
    runLookingThen(() => {
      const { resultLine: line } = onApply(intent);
      setHint(null);
      setResultLine(line);
    });
  }

  return (
    <div className={cn("w-full max-w-xl", className)}>
      <form
        className="mkt-surface flex items-center gap-2 rounded-xl px-3 py-2 shadow-none"
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
      >
        <Sparkles
          className="h-4 w-4 shrink-0 text-[#2563EB]"
          aria-hidden
          strokeWidth={1.75}
        />
        <label htmlFor="ask-procurity" className="sr-only">
          Ask Procurity
        </label>
        <input
          id="ask-procurity"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask Procurity…"
          className="min-w-0 flex-1 bg-transparent text-sm text-[#14213D] outline-none placeholder:text-[#5B6475]"
          autoComplete="off"
        />
        <button
          type="submit"
          className="mkt-btn-primary shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium"
        >
          Ask
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {ASK_SUGGESTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => pickSuggestion(s)}
            className="rounded-lg border border-[#E7DFD0] bg-[#FBF7F0]/95 px-2.5 py-1 text-left text-[11px] font-medium text-[#14213D] transition-opacity hover:opacity-80 sm:text-xs"
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-2 min-h-[1.25rem] text-xs text-[#5B6475]" aria-live="polite">
        {looking && <span className="font-medium text-[#14213D]">{lookText}</span>}
        {!looking && hint && <span>{hint}</span>}
        {!looking && resultLine && !hint && (
          <span className="font-medium text-[#14213D]">{resultLine}</span>
        )}
      </div>
    </div>
  );
}
