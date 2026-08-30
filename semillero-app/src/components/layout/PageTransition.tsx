"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { EASE_OUT } from "@/lib/motion";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const initial = reduceMotion
    ? { opacity: 1 }
    : { opacity: 0, y: 12, filter: "blur(3px)" };
  const enter = { opacity: 1, y: 0, filter: "blur(0px)" };
  const exit = reduceMotion
    ? { opacity: 1 }
    : { opacity: 0, y: -7, filter: "blur(2px)" };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={initial}
        animate={enter}
        exit={exit}
        transition={{ duration: reduceMotion ? 0 : 0.3, ease: EASE_OUT }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
