"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, Mail, MessageCircle, PhoneCall } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { BrandImagePanel } from "@/components/visual/brand-image-panel";
import { SectionHeading } from "@/components/marketing/section-heading";
import { brandImagery } from "@/lib/brand-imagery";
import {
  buildOrgRegistrationEmailHref,
  buildOrgRegistrationWhatsAppHref,
  contactConfig,
} from "@/lib/contact-config";

type OrgLeadForm = {
  organizationName: string;
  contactPerson: string;
  email: string;
  phone: string;
  organizationType: string;
  message: string;
};

const initialForm: OrgLeadForm = {
  organizationName: "",
  contactPerson: "",
  email: "",
  phone: "",
  organizationType: "Training Provider",
  message: "",
};

const organizationTypes = [
  "Training Provider",
  "Company",
  "NGO",
  "University",
  "Government Programme",
  "Skills Development Agency",
];

export default function RegisterOrganizationPage() {
  const [form, setForm] = useState<OrgLeadForm>(initialForm);

  const emailHref = useMemo(() => buildOrgRegistrationEmailHref(form), [form]);

  const launchWhatsApp = () => {
    if (typeof window === "undefined") return;
    window.open(buildOrgRegistrationWhatsAppHref(form), "_blank", "noopener,noreferrer");
  };

  return (
    <SiteShell>
      <div className="space-y-12">
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="if-panel p-6 md:p-8">
            <SectionHeading
              eyebrow="Register Organization"
              title="Start your InternFlow onboarding request"
              subtitle="Register interest and our team will guide your organization through setup, access, and implementation planning."
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
            image={brandImagery.providerControlRoom}
            eyebrow="Onboarding Path"
            title="Professional setup, not a generic signup"
            description="We align programme structure, governance expectations, and team roles before platform activation."
            imageClassName="h-full min-h-[18rem]"
          />
        </section>

        <section className="if-panel p-6 md:p-8">
          <SectionHeading
            eyebrow="Organization Profile"
            title="Share your organization details"
            subtitle="This helps us prepare the right onboarding route before setup access is issued."
          />
          <form
            className="mt-6 grid gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              launchWhatsApp();
            }}
          >
            <label className="grid gap-1 text-sm text-brand-textSoft md:col-span-2">
              Organization or company name
              <input
                required
                value={form.organizationName}
                onChange={(event) => setForm((prev) => ({ ...prev, organizationName: event.target.value }))}
                placeholder="Your organization name"
                className="px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm text-brand-textSoft">
              Contact person
              <input
                required
                value={form.contactPerson}
                onChange={(event) => setForm((prev) => ({ ...prev, contactPerson: event.target.value }))}
                placeholder="Primary contact"
                className="px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm text-brand-textSoft">
              Email
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="contact@organization.com"
                className="px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm text-brand-textSoft">
              Phone
              <input
                required
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="082 000 0000"
                className="px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm text-brand-textSoft">
              Organization type / provider type
              <select
                value={form.organizationType}
                onChange={(event) => setForm((prev) => ({ ...prev, organizationType: event.target.value }))}
                className="px-3 py-2"
              >
                {organizationTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm text-brand-textSoft md:col-span-2">
              Programme interest (optional)
              <textarea
                value={form.message}
                onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                placeholder="Tell us about your programme scope, learner volumes, or rollout timeline"
                rows={4}
                className="px-3 py-2"
              />
            </label>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button type="submit" className="if-btn if-btn-primary px-4 py-2">
                Submit via WhatsApp
              </button>
              <a href={emailHref} className="if-btn if-btn-secondary px-4 py-2">
                Submit via Email
              </a>
              <Link href="/contact" className="if-btn if-btn-secondary px-4 py-2">
                Contact Team
              </Link>
            </div>
          </form>
        </section>

        <section className="if-panel p-6 md:p-8">
          <div className="flex items-start gap-3 text-sm text-brand-textSoft">
            <div className="if-panel-muted mt-0.5 rounded-xl p-2">
              <Building2 className="h-4 w-4 text-brand-accentStrong" />
            </div>
            <p>
              Existing authenticated users can still use the internal workspace creation flow. This
              public route is the professional front-facing onboarding entry point for new organizations.
            </p>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
