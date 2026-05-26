export type SocialLink = {
  key: string;
  label: string;
  href: string;
};

const basePhoneDigits = "0826478408";
const southAfricaIntlDigits = `27${basePhoneDigits.slice(1)}`;

export const contactConfig = {
  supportLabel: "InternFlow Support",
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

  return `https://wa.me/${contactConfig.phoneIntlDigits}?text=${encodeURIComponent(lines.join("\n"))}`;
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

  return `mailto:${contactConfig.emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
}
