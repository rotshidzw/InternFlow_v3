"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

type FormState = {
  name: string;
  organization: string;
  email: string;
  message: string;
};

const initialForm: FormState = {
  name: "",
  organization: "",
  email: "",
  message: "",
};

function socialIcon(key: string) {
  if (key === "linkedin") return Linkedin;
  if (key === "github") return Github;
  return ExternalLink;
}

export default function ContactPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const searchParams = useSearchParams();
  const isDemoIntent = searchParams.get("intent") === "demo";

  const emailHref = useMemo(() => buildDemoEmailHref(form), [form]);

  const launchWhatsApp = () => {
    if (typeof window === "undefined") return;
    window.open(buildDemoWhatsAppHref(form), "_blank", "noopener,noreferrer");
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
            subtitle="Use this quick form, then choose WhatsApp or Email to send your request."
          />
          <form
            className="mt-5 grid gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              launchWhatsApp();
            }}
          >
            <label className="grid gap-1 text-sm text-brand-textSoft">
              Full name
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Your full name"
                className="px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm text-brand-textSoft">
              Organization
              <input
                value={form.organization}
                onChange={(event) => setForm((prev) => ({ ...prev, organization: event.target.value }))}
                placeholder="Organization name"
                className="px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm text-brand-textSoft">
              Work email
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="you@organization.com"
                className="px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm text-brand-textSoft md:col-span-2">
              What do you want to see in the demo?
              <textarea
                value={form.message}
                onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                placeholder="Example: learner lifecycle, attendance registers, payment evidence, and certificate tracking"
                rows={4}
                className="px-3 py-2"
              />
            </label>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button type="submit" className="if-btn if-btn-primary px-4 py-2">
                Send via WhatsApp
              </button>
              <a href={emailHref} className="if-btn if-btn-secondary px-4 py-2">
                Send via Email
              </a>
              <Link href="/" className="if-btn if-btn-secondary px-4 py-2">
                Back to Home
              </Link>
            </div>
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
