export type SocialLink = {
  key: string;
  label: string;
  href: string;
};

export type FooterLink = {
  label: string;
  href: string;
};

const basePhoneDigits = "0826478408";
const southAfricaIntlDigits = `27${basePhoneDigits.slice(1)}`;

export const contactConfig = {
  supportLabel: "InternFlow Support",
  companyName: "InternFlow",
  supportLine:
    "Enterprise operations platform for internship, learnership, and skills programme delivery with audit-ready control.",
  phoneDisplayLocal: "082 647 8408",
  phoneDisplayIntl: "+27 82 647 8408",
  phoneDigits: basePhoneDigits,
  phoneIntlDigits: southAfricaIntlDigits,
  phoneHref: `tel:+${southAfricaIntlDigits}`,
  whatsappHref: `https://wa.me/${southAfricaIntlDigits}?text=${encodeURIComponent("Hi Chester, I would like to learn more about InternFlow and request a demo.")}`,
  emailAddress: "hello@internflow.co.za",
  emailHref:
    "mailto:hello@internflow.co.za?subject=InternFlow%20Enquiry&body=Hi%20InternFlow%20team%2C%0A%0AI%20would%20like%20to%20learn%20more%20about%20the%20platform.",
  socials: [
    { key: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com" },
    { key: "x", label: "X", href: "https://x.com" },
    { key: "github", label: "GitHub", href: "https://github.com" },
  ] as SocialLink[],
  footer: {
    quickLinks: [
      { label: "Home", href: "/" },
      { label: "Solutions", href: "/solutions" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Pricing", href: "/pricing" },
    ] as FooterLink[],
    companyLinks: [
      { label: "About", href: "/about" },
      { label: "Sign In", href: "/auth/login" },
      { label: "Student Sign Up", href: "/student-sign-up" },
      { label: "Register Organization", href: "/register-organization" },
      { label: "Contact Us", href: "/contact" },
    ] as FooterLink[],
    supportLinks: [
      { label: "Request Demo", href: "/contact?intent=demo" },
      { label: "Support", href: "/contact" },
    ] as FooterLink[],
    legalLinks: [
      { label: "Privacy", href: "/contact?topic=privacy" },
      { label: "Terms", href: "/contact?topic=terms" },
    ] as FooterLink[],
  },
};

export function buildDemoWhatsAppHref(payload?: {
  name?: string;
  organization?: string;
  email?: string;
  message?: string;
}) {
  const lines = [
    "Hi Chester, I would like to request an InternFlow demo.",
    payload?.name ? `Name: ${payload.name}` : "",
    payload?.organization ? `Organization: ${payload.organization}` : "",
    payload?.email ? `Email: ${payload.email}` : "",
    payload?.message ? `Notes: ${payload.message}` : "",
  ].filter(Boolean);

  return `https://wa.me/${contactConfig.phoneIntlDigits}?text=${encodeURIComponent(lines.join("\\n"))}`;
}

export function buildDemoEmailHref(payload?: {
  name?: string;
  organization?: string;
  email?: string;
  message?: string;
}) {
  const subject = "InternFlow Demo Request";
  const bodyLines = [
    "Hi Chester,",
    "",
    "I would like to request an InternFlow demo.",
    payload?.name ? `Name: ${payload.name}` : "",
    payload?.organization ? `Organization: ${payload.organization}` : "",
    payload?.email ? `Email: ${payload.email}` : "",
    payload?.message ? `Notes: ${payload.message}` : "",
    "",
    "Thank you.",
  ].filter(Boolean);

  return `mailto:${contactConfig.emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\\n"))}`;
}

export function buildOrgRegistrationWhatsAppHref(payload?: {
  organizationName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  organizationType?: string;
  message?: string;
}) {
  const lines = [
    "Hi Chester, we would like to register our organization with InternFlow.",
    payload?.organizationName ? `Organization: ${payload.organizationName}` : "",
    payload?.contactPerson ? `Contact person: ${payload.contactPerson}` : "",
    payload?.email ? `Email: ${payload.email}` : "",
    payload?.phone ? `Phone: ${payload.phone}` : "",
    payload?.organizationType ? `Organization type: ${payload.organizationType}` : "",
    payload?.message ? `Programme interest: ${payload.message}` : "",
  ].filter(Boolean);

  return `https://wa.me/${contactConfig.phoneIntlDigits}?text=${encodeURIComponent(lines.join("\\n"))}`;
}

export function buildOrgRegistrationEmailHref(payload?: {
  organizationName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  organizationType?: string;
  message?: string;
}) {
  const subject = "InternFlow Organization Registration Interest";
  const bodyLines = [
    "Hi Chester,",
    "",
    "We would like to register our organization with InternFlow.",
    payload?.organizationName ? `Organization: ${payload.organizationName}` : "",
    payload?.contactPerson ? `Contact person: ${payload.contactPerson}` : "",
    payload?.email ? `Email: ${payload.email}` : "",
    payload?.phone ? `Phone: ${payload.phone}` : "",
    payload?.organizationType ? `Organization type: ${payload.organizationType}` : "",
    payload?.message ? `Programme interest: ${payload.message}` : "",
    "",
    "Thank you.",
  ].filter(Boolean);

  return `mailto:${contactConfig.emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\\n"))}`;
}
