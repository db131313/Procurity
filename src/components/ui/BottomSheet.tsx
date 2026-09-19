"use client";

import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** `full` = nearly full-height project overlay; default = compact preview */
  variant?: "default" | "full";
};

export function BottomSheet({
  open,
  onClose,
  children,
  variant = "default",
}: BottomSheetProps) {
  const controls = useDragControls();
  const isFull = variant === "full";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Dismiss"
            className="fixed inset-0 z-30 bg-ink/40 md:z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            className={cn(
              "fixed inset-x-0 z-50 mx-auto flex flex-col overflow-hidden bg-white shadow-2xl",
              isFull
                ? "bottom-[calc(64px+var(--safe-bottom))] max-h-[min(88dvh,860px)] max-w-xl rounded-t-[24px] md:bottom-3 md:max-h-[min(90dvh,900px)] md:max-w-2xl"
                : "bottom-[calc(64px+var(--safe-bottom))] max-w-lg rounded-t-[24px] px-4 pb-4 pt-2 md:bottom-0 md:pb-[calc(16px+var(--safe-bottom))]",
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 400) onClose();
            }}
          >
            {isFull ? (
              <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(16px+var(--safe-bottom))] md:pb-6">
                {/* Drag handle overlaid on imagery — no top padding above the photo */}
                <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center">
                  <div
                    className="pointer-events-auto h-1.5 w-12 cursor-grab touch-none rounded-full bg-white/85 shadow-sm ring-1 ring-black/10 active:cursor-grabbing"
                    onPointerDown={(e) => controls.start(e)}
                  />
                </div>
                {children}
              </div>
            ) : (
              <>
                <div
                  className="mx-auto mb-3 h-1.5 w-12 shrink-0 cursor-grab touch-none rounded-full bg-line active:cursor-grabbing"
                  onPointerDown={(e) => controls.start(e)}
                />
                {children}
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
