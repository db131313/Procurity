"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
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

function CardBody({
  card,
  dragging,
}: {
  card: PipelineCard;
  dragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-white p-3 shadow-sm",
        dragging && "opacity-90 shadow-lg ring-2 ring-purple/30",
      )}
    >
      <p className="text-[11px] font-bold tabular-nums text-purple">
        Score {card.score}
      </p>
      <p className="mt-0.5 text-sm font-bold text-ink">{card.address}</p>
    </div>
  );
}

function DraggableCard({
  card,
  onMove,
}: {
  card: PipelineCard;
  onMove: (stage: PipelineStage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.itemId, data: { card } });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
      }}
      className="touch-none"
    >
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
        <CardBody card={card} />
      </div>
      <div
        className="mt-2 flex flex-wrap gap-1 md:hidden"
        aria-label={`Move ${card.address}`}
      >
        {STAGES.filter((s) => s.key !== card.stage).map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onMove(s.key)}
            className="rounded-full border border-line bg-offwhite px-2 py-1 text-[10px] font-bold text-ink"
          >
            → {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Column({
  stage,
  label,
  cards,
  onMove,
}: {
  stage: PipelineStage;
  label: string;
  cards: PipelineCard[];
  onMove: (itemId: string, stage: PipelineStage) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-[220px] w-[260px] shrink-0 flex-col rounded-[20px] border border-line bg-white/80 p-3 md:w-auto md:min-w-0",
        isOver && "ring-2 ring-purple/40",
      )}
      aria-label={`${label} column`}
    >
      <header className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-bold text-ink">{label}</h2>
        <span className="rounded-full bg-offwhite px-2 py-0.5 text-[11px] font-bold text-slate">
          {cards.length}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2">
        {cards.map((card) => (
          <DraggableCard
            key={card.itemId}
            card={card}
            onMove={(next) => onMove(card.itemId, next)}
          />
        ))}
        {!cards.length && (
          <p className="px-1 py-6 text-center text-xs text-slate">Drop here</p>
        )}
      </div>
    </section>
  );
}

export function PipelineBoard({ initialCards }: { initialCards: PipelineCard[] }) {
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const byStage = useMemo(() => {
    const map: Record<PipelineStage, PipelineCard[]> = {
      new: [],
      contacted: [],
      quoted: [],
      won: [],
      lost: [],
    };
    cards.forEach((c) => map[c.stage].push(c));
    return map;
  }, [cards]);

  const activeCard = cards.find((c) => c.itemId === activeId) ?? null;

  function applyMove(itemId: string, stage: PipelineStage) {
    const card = cards.find((c) => c.itemId === itemId);
    if (!card || card.stage === stage) return;

    setCards((prev) =>
      prev.map((c) => (c.itemId === itemId ? { ...c, stage } : c)),
    );

    startTransition(async () => {
      await movePipelineStage(itemId, stage, card.projectId);
      // Server action redirects to deal won when stage === "won"
      if (stage !== "won") router.refresh();
    });
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const overId = event.over?.id;
    if (!overId) return;
    const stage = String(overId) as PipelineStage;
    if (!STAGES.some((s) => s.key === stage)) return;
    applyMove(String(event.active.id), stage);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 md:grid md:grid-cols-5 md:overflow-visible md:gap-3">
        {STAGES.map((s) => (
          <Column
            key={s.key}
            stage={s.key}
            label={s.label}
            cards={byStage[s.key]}
            onMove={applyMove}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? <CardBody card={activeCard} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
