"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Map needs instant paint — skip the fade/slide that delays first pixels.
  const instant = pathname === "/app/map";

  return (
    <motion.div
      initial={instant ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        instant
          ? { duration: 0 }
          : { duration: 0.28, ease: "easeOut" }
      }
      className="flex min-h-0 min-w-0 flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}
