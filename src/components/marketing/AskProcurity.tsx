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
  /** Smaller chips / input for the value-prop panel */
  compact?: boolean;
};

export function AskProcurity({ onApply, className, compact = false }: Props) {
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
    <div className={cn("w-full", className)}>
      <form
        className={cn(
          "mkt-surface flex items-center gap-2 shadow-none",
          compact ? "rounded-lg px-2.5 py-1.5" : "rounded-xl px-3 py-2",
        )}
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
      >
        <Sparkles
          className={cn(
            "shrink-0 text-[#2563EB]",
            compact ? "h-3.5 w-3.5" : "h-4 w-4",
          )}
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
          className={cn(
            "min-w-0 flex-1 bg-transparent text-[#14213D] outline-none placeholder:text-[#5B6475]",
            compact ? "text-xs" : "text-sm",
          )}
          autoComplete="off"
        />
        <button
          type="submit"
          className={cn(
            "mkt-btn-primary shrink-0 font-medium",
            compact
              ? "rounded-md px-2 py-1 text-[11px]"
              : "rounded-lg px-3 py-1.5 text-xs",
          )}
        >
          Ask
        </button>
      </form>

      <div className={cn("flex flex-wrap gap-1", compact ? "mt-1.5" : "mt-2 gap-1.5")}>
        {ASK_SUGGESTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => pickSuggestion(s)}
            className={cn(
              "rounded-md border border-[#E7DFD0] bg-transparent text-left font-medium text-[#5B6475] transition-opacity hover:text-[#14213D] hover:opacity-90",
              compact
                ? "px-1.5 py-0.5 text-[10px] leading-snug"
                : "px-2.5 py-1 text-[11px] sm:text-xs",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div
        className={cn(
          "min-h-[1rem] text-[#5B6475]",
          compact ? "mt-1 text-[10px]" : "mt-2 text-xs",
        )}
        aria-live="polite"
      >
        {looking && <span className="font-medium text-[#14213D]">{lookText}</span>}
        {!looking && hint && <span>{hint}</span>}
        {!looking && resultLine && !hint && (
          <span className="font-medium text-[#14213D]">{resultLine}</span>
        )}
      </div>
    </div>
  );
}
