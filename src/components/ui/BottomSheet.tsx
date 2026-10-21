"use client";

/**
 * Mobile bottom sheet with swipe-to-dismiss.
 *
 * Root cause of the dismiss bug:
 * - `dragConstraints={{ top: 0, bottom: 0 }}` blocked real downward travel
 *   (only rubber-band elastic), so dismiss thresholds rarely fired.
 * - The full variant put the handle inside `overflow-y-auto`, so vertical
 *   gestures scrolled content instead of dragging the sheet.
 * - No body scroll lock, so the page behind moved with the gesture.
 */

import {
  AnimatePresence,
  motion,
  useDragControls,
  type PanInfo,
} from "framer-motion";
import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/cn";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** `full` = nearly full-height project overlay; default = compact preview */
  variant?: "default" | "full";
};

const DISMISS_OFFSET_PX = 120;
const DISMISS_VELOCITY = 650;

export function BottomSheet({
  open,
  onClose,
  children,
  variant = "default",
}: BottomSheetProps) {
  const controls = useDragControls();
  const isFull = variant === "full";
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const startDrag = useCallback(
    (e: ReactPointerEvent) => {
      e.stopPropagation();
      controls.start(e);
    },
    [controls],
  );

  /** Only start sheet-drag from content when scrolled to top. */
  const onContentPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = scrollRef.current;
      if (!el) return;
      if (el.scrollTop > 1) return;
      controls.start(e);
    },
    [controls],
  );

  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (
        info.offset.y > DISMISS_OFFSET_PX ||
        info.velocity.y > DISMISS_VELOCITY
      ) {
        onClose();
      }
    },
    [onClose],
  );

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
                ? "bottom-0 max-h-[min(92dvh,900px)] max-w-xl rounded-t-[24px] pb-[env(safe-area-inset-bottom)] md:bottom-3 md:max-h-[min(90dvh,900px)] md:max-w-2xl"
                : "bottom-0 max-w-lg rounded-t-[24px] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2",
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.9 }}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 560 }}
            dragElastic={{ top: 0.04, bottom: 0.12 }}
            dragMomentum={false}
            onDragEnd={onDragEnd}
            style={{ touchAction: "none" }}
          >
            {/* Drag handle — outside the scroll region so it always receives gestures */}
            <div
              className="relative z-20 flex shrink-0 cursor-grab touch-none flex-col items-center active:cursor-grabbing"
              style={{ touchAction: "none" }}
              onPointerDown={startDrag}
              data-sheet-handle
            >
              <div className="flex w-full items-center justify-center pb-2 pt-3">
                <div className="h-1.5 w-12 rounded-full bg-line shadow-sm ring-1 ring-black/5" />
              </div>
              <span className="sr-only">Drag down to close</span>
            </div>

            <div
              ref={scrollRef}
              className={cn(
                "relative min-h-0 flex-1 overscroll-contain",
                isFull ? "overflow-y-auto" : "overflow-visible",
              )}
              onPointerDown={onContentPointerDown}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
