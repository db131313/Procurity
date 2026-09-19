"use client";

import { AnimatePresence, motion, useDragControls } from "framer-motion";
import type { ReactNode } from "react";
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
                ? "bottom-[calc(64px+var(--safe-bottom))] max-h-[min(92dvh,920px)] max-w-xl rounded-t-[24px] md:bottom-0 md:max-h-[min(94dvh,960px)] md:max-w-2xl"
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
            <div
              className={cn(
                "mx-auto shrink-0 cursor-grab touch-none active:cursor-grabbing",
                isFull ? "mb-0 mt-2 h-1.5 w-12 rounded-full bg-line" : "mb-3 h-1.5 w-12 rounded-full bg-line",
              )}
              onPointerDown={(e) => controls.start(e)}
            />
            {isFull ? (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(16px+var(--safe-bottom))] md:pb-6">
                {children}
              </div>
            ) : (
              children
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
