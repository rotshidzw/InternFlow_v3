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
                boxShadow: "0 22px 54px rgba(168, 85, 247, 0.28)",
              }
        }
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="if-panel rounded-2xl p-5 transition-all duration-300 ease-out backdrop-blur"
      >
        {children}
      </motion.div>
    </FadeInSection>
  );
}
