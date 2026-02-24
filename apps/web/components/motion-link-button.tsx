"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

export function MotionLinkButton({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="inline-flex"
    >
      <Link href={href} className={className}>
        {label}
      </Link>
    </motion.div>
  );
}
