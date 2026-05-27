"use client";

import { motion, useReducedMotion } from "framer-motion";

export function MotionLinkButton({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="inline-flex"
    >
      <a href={href} className={className ?? "if-btn if-btn-primary"}>
        {label}
      </a>
    </motion.div>
  );
}
