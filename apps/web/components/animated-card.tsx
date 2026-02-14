"use client";

import { motion } from "framer-motion";
import { PropsWithChildren } from "react";

export function AnimatedCard({ children }: PropsWithChildren) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900">
      {children}
    </motion.div>
  );
}
