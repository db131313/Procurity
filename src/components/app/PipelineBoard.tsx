"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { PipelineStage } from "@/lib/db/types";
import { movePipelineStage } from "@/app/actions/pipeline";

export type PipelineCard = {
  itemId: string;
  projectId: string;
  stage: PipelineStage;
  score: number;
  address: string;
};

const STAGES: { key: PipelineStage; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "quoted", label: "Quoted" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

export function PipelineBoard({ initialCards }: { initialCards: PipelineCard[] }) {
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [, startTransition] = useTransition();

  const grouped = useMemo(() => {
    return STAGES.map((stage) => ({
      ...stage,
      items: cards.filter((c) => c.stage === stage.key),
    }));
  }, [cards]);

  function onChangeStage(itemId: string, stage: PipelineStage) {
    const card = cards.find((c) => c.itemId === itemId);
    if (!card || card.stage === stage) return;

    setCards((prev) =>
      prev.map((c) => (c.itemId === itemId ? { ...c, stage } : c)),
    );

    startTransition(async () => {
      await movePipelineStage(itemId, stage);
      if (stage === "won") {
        router.push(`/app/deal/${encodeURIComponent(card.projectId)}/won`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <LayoutGroup>
      <div className="space-y-6">
        {grouped.map((section) => (
          <section key={section.key} aria-label={section.label}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate">
                {section.label}
              </h2>
              <span className="text-xs font-semibold tabular-nums text-slate">
                {section.items.length}
              </span>
            </div>
            <div className="space-y-2">
              <AnimatePresence initial={false} mode="popLayout">
                {section.items.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-slate">
                    No deals here yet
                  </p>
                ) : (
                  section.items.map((card) => (
                    <motion.div
                      key={card.itemId}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className="rounded-2xl border border-line bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/app/project/${encodeURIComponent(card.projectId)}`}
                          className="min-w-0 flex-1"
                        >
                          <p className="text-[11px] font-bold tabular-nums text-purple">
                            Score {card.score}
                          </p>
                          <p className="mt-0.5 text-sm font-bold text-ink">
                            {card.address}
                          </p>
                        </Link>
                      </div>
                      <label className="mt-3 flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate">
                          Status
                        </span>
                        <select
                          aria-label={`Status for ${card.address}`}
                          className={cn(
                            "min-h-10 flex-1 rounded-full border border-line bg-offwhite px-3 text-xs font-bold text-ink outline-none",
                          )}
                          value={card.stage}
                          onChange={(e) =>
                            onChangeStage(
                              card.itemId,
                              e.target.value as PipelineStage,
                            )
                          }
                        >
                          {STAGES.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </section>
        ))}
      </div>
    </LayoutGroup>
  );
}
