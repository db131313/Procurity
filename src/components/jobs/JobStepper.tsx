"use client";

import { cn } from "@/lib/cn";
import { JOB_STAGES, type JobStatus, stageIndex } from "@/lib/jobs/types";

export function JobStepper({
  status,
  onSelect,
}: {
  status: JobStatus;
  onSelect?: (status: JobStatus) => void;
}) {
  const current = stageIndex(status);

  return (
    <ol className="flex w-full items-start gap-1 overflow-x-auto pb-1">
      {JOB_STAGES.map((stage) => {
        const done = stage.step < current || status === "completed";
        const active = stage.step === current && status !== "completed";
        return (
          <li key={stage.status} className="min-w-0 flex-1">
            <button
              type="button"
              disabled={!onSelect}
              onClick={() => onSelect?.(stage.status)}
              className={cn(
                "flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-center transition",
                onSelect && "hover:bg-offwhite",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                  done || active
                    ? "bg-purple text-white"
                    : "bg-line text-slate",
                )}
              >
                {stage.step}
              </span>
              <span
                className={cn(
                  "truncate text-[10px] font-semibold sm:text-xs",
                  active ? "text-ink" : "text-slate",
                )}
              >
                {stage.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
