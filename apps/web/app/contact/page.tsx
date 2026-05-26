"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ExternalLink,
  Github,
  Linkedin,
  Mail,
  MessageCircle,
  PhoneCall,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { BrandImagePanel } from "@/components/visual/brand-image-panel";
import { SectionHeading } from "@/components/marketing/section-heading";
import { brandImagery } from "@/lib/brand-imagery";
import { buildDemoEmailHref, buildDemoWhatsAppHref, contactConfig } from "@/lib/contact-config";
import { submitPublicContact } from "@/lib/public-contact";

type FormState = {
  name: string;
  organization: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
};

const initialForm: FormState = {
  name: "",
  organization: "",
  email: "",
  phone: "",
  topic: "",
  message: "",
};

function socialIcon(key: string) {
  if (key === "linkedin") return Linkedin;
  if (key === "github") return Github;
  return ExternalLink;
}

export default function ContactPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitState, setSubmitState] = useState<{
    status: "idle" | "submitting" | "success" | "error";
    note?: string;
    ticketId?: string;
  }>({ status: "idle" });
  const searchParams = useSearchParams();
  const isDemoIntent = searchParams.get("intent") === "demo";
  const topicFromQuery = searchParams.get("topic");

  useEffect(() => {
    if (!topicFromQuery && !isDemoIntent) return;
    setForm((prev) => ({
      ...prev,
      topic: topicFromQuery ?? (isDemoIntent ? "Demo request" : prev.topic),
    }));
  }, [isDemoIntent, topicFromQuery]);

  const emailHref = useMemo(() => buildDemoEmailHref(form), [form]);

  const launchWhatsApp = () => {
    if (typeof window === "undefined") return;
    window.open(buildDemoWhatsAppHref(form), "_blank", "noopener,noreferrer");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitState({ status: "submitting" });

    const result = await submitPublicContact({
      name: form.name,
      organization: form.organization,
      email: form.email,
      phone: form.phone || undefined,
      topic: form.topic || undefined,
      message: form.message,
      intent: isDemoIntent ? "demo" : "general",
      source: "contact-page",
    });

    if (!result.ok) {
      setSubmitState({
        status: "error",
        note: result.error ?? "Unable to submit your message right now. Please try again.",
      });
      return;
    }

    setSubmitState({
      status: "success",
      note: result.message ?? "Message received. Our team will respond shortly.",
      ticketId: result.ticketId,
    });
    setForm((prev) => ({ ...prev, message: "" }));
  };

  return (
    <SiteShell>
      <div className="space-y-12">
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="if-panel p-6 md:p-8">
            <SectionHeading
              eyebrow="Contact Us"
              title={isDemoIntent ? "Contact for Demo Access" : "Start a conversation with InternFlow"}
              subtitle="Share your operational context and we will guide the best next step. Demo access is provided after initial alignment."
            />
            <div className="mt-5 grid gap-2 text-sm text-brand-textSoft">
              <a href={contactConfig.whatsappHref} target="_blank" rel="noreferrer" className="if-btn if-btn-primary justify-between px-3 py-2 text-xs">
                <span className="inline-flex items-center gap-2"><MessageCircle className="h-4 w-4" /> WhatsApp</span>
                <span>{contactConfig.phoneDisplayLocal}</span>
              </a>
              <a href={contactConfig.phoneHref} className="if-btn if-btn-secondary justify-between px-3 py-2 text-xs">
                <span className="inline-flex items-center gap-2"><PhoneCall className="h-4 w-4" /> Call</span>
                <span>{contactConfig.phoneDisplayIntl}</span>
              </a>
              <a href={contactConfig.emailHref} className="if-btn if-btn-secondary justify-between px-3 py-2 text-xs">
                <span className="inline-flex items-center gap-2"><Mail className="h-4 w-4" /> Email</span>
                <span>{contactConfig.emailAddress}</span>
              </a>
            </div>
          </div>
          <BrandImagePanel
            image={brandImagery.workflowIntelligence}
            eyebrow="Discovery First"
            title="Demo sessions are tailored to your workflow"
            description="We align on programme operations, compliance expectations, and team structure before opening demo paths."
            imageClassName="h-full min-h-[18rem]"
          />
        </section>

        <section className="if-panel p-6 md:p-8">
          <SectionHeading
            eyebrow="Demo Request"
            title="Tell us what you need"
            subtitle="Use this for contact and demo conversations. For account creation, use Student Sign Up or Register Organization."
          />
          <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={submit}>
            <label className="grid gap-1 text-sm text-brand-textSoft">
              Full name
              <input
                required
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Your full name"
                className="px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm text-brand-textSoft">
              Organization
              <input
                required
                value={form.organization}
                onChange={(event) => setForm((prev) => ({ ...prev, organization: event.target.value }))}
                placeholder="Organization name"
                className="px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm text-brand-textSoft">
              Work email
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="you@organization.com"
                className="px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm text-brand-textSoft">
              Phone (optional)
              <input
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="+27 82 000 0000"
                className="px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm text-brand-textSoft md:col-span-2">
              Topic (optional)
              <input
                value={form.topic}
                onChange={(event) => setForm((prev) => ({ ...prev, topic: event.target.value }))}
                placeholder="Demo request, implementation question, pricing, support..."
                className="px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm text-brand-textSoft md:col-span-2">
              What do you want to see in the demo?
              <textarea
                required
                value={form.message}
                onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                placeholder="Example: learner lifecycle, attendance registers, payment evidence, and certificate tracking"
                rows={4}
                className="px-3 py-2"
              />
            </label>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitState.status === "submitting"}
                className="if-btn if-btn-primary px-4 py-2 disabled:opacity-70"
              >
                {submitState.status === "submitting" ? "Sending..." : "Send Message"}
              </button>
              <button type="button" onClick={launchWhatsApp} className="if-btn if-btn-secondary px-4 py-2">
                Send via WhatsApp
              </button>
              <a href={emailHref} className="if-btn if-btn-secondary px-4 py-2">
                Send via Email
              </a>
              <Link href="/" className="if-btn if-btn-secondary px-4 py-2">
                Back to Home
              </Link>
            </div>
            {submitState.status === "success" ? (
              <p className="md:col-span-2 if-status-success rounded-xl border px-3 py-2 text-xs">
                {submitState.note} {submitState.ticketId ? `Reference: ${submitState.ticketId}` : ""}
              </p>
            ) : null}
            {submitState.status === "error" ? (
              <p className="md:col-span-2 if-status-error rounded-xl border px-3 py-2 text-xs">
                {submitState.note}
              </p>
            ) : null}
          </form>
        </section>

        <section className="if-panel p-6 md:p-8">
          <SectionHeading
            eyebrow="Social"
            title="Follow and connect"
            subtitle="Social profiles are centrally configurable and can be updated later without changing page structure."
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {contactConfig.socials.map((social) => {
              const Icon = socialIcon(social.key);
              return (
                <a key={social.key} href={social.href} target="_blank" rel="noreferrer" className="if-btn if-btn-secondary px-3 py-2 text-xs">
                  <Icon className="h-3.5 w-3.5" />
                  {social.label}
                </a>
              );
            })}
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
