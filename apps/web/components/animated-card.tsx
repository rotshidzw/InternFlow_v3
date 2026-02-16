"use client";

import { motion } from "framer-motion";
import { PropsWithChildren } from "react";

export function AnimatedCard({ children }: PropsWithChildren) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-[0_0_35px_rgba(16,185,129,0.15)] backdrop-blur"
    >
      {children}
    </motion.div>
  );
}
