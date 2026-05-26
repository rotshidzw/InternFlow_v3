"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  ExternalLink,
  Github,
  Linkedin,
  Mail,
  MessageCircle,
  PhoneCall,
  X,
} from "lucide-react";
import { contactConfig } from "@/lib/contact-config";

function socialIcon(key: string) {
  if (key === "linkedin") return Linkedin;
  if (key === "github") return Github;
  return ExternalLink;
}

export function ContactLauncher({
  open,
  setOpen,
  demoIntent = false,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  demoIntent?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!demoIntent) return;
    setOpen(true);
  }, [demoIntent, setOpen]);

  const socialLinks = useMemo(() => contactConfig.socials, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-5 right-4 z-40 md:bottom-6 md:right-6">
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="if-panel mb-3 w-[min(92vw,22.5rem)] overflow-hidden"
          >
            <div className="if-image-overlay relative border-b border-brand-border/70 p-4" aria-hidden />
            <div className="relative -mt-12 p-4 pt-0">
              <div className="mb-3 flex items-center justify-between">
                <div className="if-panel-muted inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-brand-textSoft">
                  <Bot className="h-3.5 w-3.5 text-brand-accentStrong" />
                  Contact Assistant
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1 text-brand-muted transition hover:bg-brand-surface hover:text-brand-text"
                  aria-label="Close contact panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <h3 className="text-base font-semibold text-brand-text">Talk to the InternFlow team</h3>
              <p className="mt-1 text-xs text-brand-textSoft">
                Demo access follows a quick discovery conversation so we can align the platform to
                your operational context.
              </p>

              <div className="mt-4 grid gap-2 text-sm">
                <a
                  href={contactConfig.whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="if-btn if-btn-primary justify-between px-3 py-2 text-xs"
                >
                  <span className="inline-flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </span>
                  <span>{contactConfig.phoneDisplayLocal}</span>
                </a>
                <a href={contactConfig.phoneHref} className="if-btn if-btn-secondary justify-between px-3 py-2 text-xs">
                  <span className="inline-flex items-center gap-2">
                    <PhoneCall className="h-4 w-4" /> Call
                  </span>
                  <span>{contactConfig.phoneDisplayIntl}</span>
                </a>
                <a href={contactConfig.emailHref} className="if-btn if-btn-secondary justify-between px-3 py-2 text-xs">
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Email
                  </span>
                  <span>{contactConfig.emailAddress}</span>
                </a>
                <Link href="/contact?intent=demo" className="if-btn if-btn-secondary px-3 py-2 text-xs" onClick={() => setOpen(false)}>
                  Contact for Demo
                </Link>
              </div>

              <div className="mt-4 border-t border-brand-border/60 pt-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">Social</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {socialLinks.map((social) => {
                    const Icon = socialIcon(social.key);
                    return (
                      <a
                        key={social.key}
                        href={social.href}
                        target="_blank"
                        rel="noreferrer"
                        className="if-btn if-btn-secondary px-2.5 py-1.5 text-xs"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {social.label}
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="if-btn if-btn-primary h-12 w-12 rounded-full p-0 shadow-[0_0_26px_rgba(168,85,247,0.5)]"
        aria-label={open ? "Close contact launcher" : "Open contact launcher"}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}
