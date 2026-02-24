"use client";

import { motion, useReducedMotion } from "framer-motion";
import { PropsWithChildren } from "react";
import { FadeInSection } from "@/components/fade-in-section";

export function AnimatedCard({ children }: PropsWithChildren) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <FadeInSection>
      <motion.div
        whileHover={
          prefersReducedMotion
            ? undefined
            : {
                y: -6,
                scale: 1.02,
                boxShadow: "0 22px 50px rgba(2, 6, 23, 0.45)",
              }
        }
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-lg transition-all duration-300 ease-out hover:shadow-2xl backdrop-blur"
      >
        {children}
      </motion.div>
    </FadeInSection>
  );
}
