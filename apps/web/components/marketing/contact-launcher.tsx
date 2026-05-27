"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  ExternalLink,
  Github,
  Linkedin,
  Mail,
  MessageCircle,
  PhoneCall,
  SendHorizontal,
  X,
} from "lucide-react";
import { contactConfig } from "@/lib/contact-config";
import { submitPublicContact } from "@/lib/public-contact";

type ChatEntry = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

function socialIcon(key: string) {
  if (key === "linkedin") return Linkedin;
  if (key === "github") return Github;
  return ExternalLink;
}

function welcomeText(demoIntent: boolean) {
  if (demoIntent) {
    return "Welcome. Share your demo needs and we will start the onboarding conversation.";
  }
  return "Hi. Send a message and our team will respond with the right next step.";
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
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    topic: demoIntent ? "Demo request" : "General enquiry",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [chatEntries, setChatEntries] = useState<ChatEntry[]>([
    { id: "welcome", role: "assistant", text: welcomeText(demoIntent) },
  ]);
  const streamRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!demoIntent) return;
    setOpen(true);
    setForm((prev) => ({
      ...prev,
      topic: "Demo request",
      message: prev.message || "I would like to request a product demo.",
    }));
    setChatEntries([{ id: "welcome-demo", role: "assistant", text: welcomeText(true) }]);
  }, [demoIntent, setOpen]);

  useEffect(() => {
    if (!open || !streamRef.current) return;
    streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [chatEntries, open]);

  const socialLinks = useMemo(() => contactConfig.socials, []);

  const pushEntry = (role: "assistant" | "user", text: string) => {
    setChatEntries((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, role, text }]);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanMessage = form.message.trim();
    if (!cleanMessage) return;

    if (!form.name.trim() || !form.email.trim()) {
      pushEntry("assistant", "Please add your name and email so we can respond properly.");
      return;
    }

    pushEntry("user", cleanMessage);
    setForm((prev) => ({ ...prev, message: "" }));
    setSending(true);

    const result = await submitPublicContact({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || undefined,
      topic: form.topic.trim() || undefined,
      message: cleanMessage,
      intent: demoIntent ? "demo" : "chat",
      source: "floating-chat-launcher",
    });

    setSending(false);

    if (!result.ok) {
      pushEntry(
        "assistant",
        result.error ?? "We could not submit that message right now. Please try again or use WhatsApp.",
      );
      return;
    }

    pushEntry(
      "assistant",
      `${result.message ?? "Message received."} ${result.ticketId ? `Reference: ${result.ticketId}` : ""}`.trim(),
    );
  };

  if (!mounted) return null;

  return (
    <div className="fixed bottom-5 right-4 z-40 md:bottom-6 md:right-6">
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="if-panel mb-3 w-[min(95vw,23rem)] overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-brand-border/70 px-3 py-2.5">
              <div className="if-panel-muted inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] text-brand-textSoft">
                <Bot className="h-3.5 w-3.5 text-brand-accentStrong" />
                Chat with InternFlow
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-brand-muted transition hover:bg-brand-surface hover:text-brand-text"
                aria-label="Close chat panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3">
              <div
                ref={streamRef}
                className="if-panel-muted h-44 overflow-y-auto rounded-xl p-2.5"
              >
                <div className="space-y-2">
                  {chatEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`max-w-[92%] rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed ${
                        entry.role === "user"
                          ? "ml-auto border-brand-accent/45 bg-brand-accent/15 text-brand-text"
                          : "mr-auto border-brand-border/75 bg-brand-surface/80 text-brand-textSoft"
                      }`}
                    >
                      {entry.text}
                    </div>
                  ))}
                </div>
              </div>

              <form className="mt-2.5 space-y-2" onSubmit={submit}>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Name"
                    className="px-2.5 py-2 text-xs"
                  />
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="Email"
                    className="px-2.5 py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={form.topic}
                    onChange={(event) => setForm((prev) => ({ ...prev, topic: event.target.value }))}
                    className="px-2.5 py-2 text-xs"
                  >
                    <option>General enquiry</option>
                    <option>Demo request</option>
                    <option>Organization onboarding</option>
                    <option>Student onboarding</option>
                    <option>Support</option>
                  </select>
                  <input
                    value={form.phone}
                    onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="Phone (optional)"
                    className="px-2.5 py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    required
                    value={form.message}
                    onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                    placeholder="Type your message..."
                    className="px-2.5 py-2 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    className="if-btn if-btn-primary px-3 py-2 text-xs disabled:opacity-60"
                    aria-label="Send message"
                  >
                    <SendHorizontal className="h-3.5 w-3.5" />
                    {sending ? "Sending" : "Send"}
                  </button>
                </div>
              </form>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <a
                  href={contactConfig.whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="if-btn if-btn-secondary justify-center px-2 py-1.5 text-[11px]"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
                <a href={contactConfig.phoneHref} className="if-btn if-btn-secondary justify-center px-2 py-1.5 text-[11px]">
                  <PhoneCall className="h-3.5 w-3.5" /> Call
                </a>
                <a href={contactConfig.emailHref} className="if-btn if-btn-secondary justify-center px-2 py-1.5 text-[11px]">
                  <Mail className="h-3.5 w-3.5" /> Email
                </a>
                <Link href="/contact?intent=demo" className="if-btn if-btn-secondary justify-center px-2 py-1.5 text-[11px]" onClick={() => setOpen(false)}>
                  Request Demo
                </Link>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5 border-t border-brand-border/60 pt-2">
                {socialLinks.map((social) => {
                  const Icon = socialIcon(social.key);
                  return (
                    <a
                      key={social.key}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      className="if-btn if-btn-secondary px-2 py-1 text-[10px]"
                    >
                      <Icon className="h-3 w-3" />
                      {social.label}
                    </a>
                  );
                })}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="if-btn if-btn-primary h-12 w-12 rounded-full p-0 shadow-[0_0_24px_rgba(168,85,247,0.45)]"
        aria-label={open ? "Close contact launcher" : "Open contact launcher"}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}
