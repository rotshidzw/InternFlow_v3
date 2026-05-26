import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { z } from "zod";
import { contactConfig } from "@/lib/contact-config";
import { sendPlatformEmailMany } from "@/lib/mailer";

const WHATSAPP_WEBHOOK_URL = process.env.CONTACT_WHATSAPP_WEBHOOK_URL;

const contactSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(140),
  email: z.string().trim().email("Valid email is required").max(180),
  message: z.string().trim().min(8, "Message is required").max(4000),
  phone: z.string().trim().max(48).optional().or(z.literal("")),
  topic: z.string().trim().max(140).optional().or(z.literal("")),
  organization: z.string().trim().max(180).optional().or(z.literal("")),
  organizationType: z.string().trim().max(120).optional().or(z.literal("")),
  source: z.string().trim().max(80).optional().or(z.literal("")),
  intent: z.enum(["general", "demo", "org_registration", "chat"]).default("general"),
});

type ContactIntent = z.infer<typeof contactSchema>["intent"];

const ticketTitleByIntent: Record<ContactIntent, string> = {
  general: "Website contact request",
  demo: "Website demo request",
  org_registration: "Organization onboarding request",
  chat: "Website chat message",
};

function compact(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

async function sendWhatsAppWebhook(payload: Record<string, unknown>) {
  if (!WHATSAPP_WEBHOOK_URL) return "skipped" as const;

  try {
    const response = await fetch(WHATSAPP_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok ? ("sent" as const) : ("failed" as const);
  } catch (error) {
    console.warn("[public-contact] WhatsApp webhook notification failed", error);
    return "failed" as const;
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
) {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid contact payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = {
    ...parsed.data,
    name: parsed.data.name.trim(),
    email: parsed.data.email.trim().toLowerCase(),
    message: parsed.data.message.trim(),
    phone: compact(parsed.data.phone),
    topic: compact(parsed.data.topic),
    organization: compact(parsed.data.organization),
    organizationType: compact(parsed.data.organizationType),
    source: compact(parsed.data.source),
  };

  const supportMembers = await prisma.platformMembership.findMany({
    where: {
      role: { in: ["PLATFORM_ADMIN", "PLATFORM_SUPPORT", "PLATFORM_OPS", "PLATFORM_SALES"] },
    },
    include: { user: true },
  });
  const recipientUserIds = Array.from(new Set(supportMembers.map((member) => member.userId)));
  const recipientEmails = Array.from(
    new Set(
      [contactConfig.emailAddress, ...supportMembers.map((member) => member.user.email)]
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  const created = await prisma.$transaction(async (tx) => {
    const contactUser = await tx.user.upsert({
      where: { email: payload.email },
      update: {},
      create: {
        email: payload.email,
        name: payload.name,
        role: "STUDENT",
      },
    });

    const detailRows = [
      `Contact: ${payload.name} <${payload.email}>`,
      payload.phone ? `Phone: ${payload.phone}` : null,
      payload.organization ? `Organization: ${payload.organization}` : null,
      payload.organizationType ? `Organization type: ${payload.organizationType}` : null,
      payload.topic ? `Topic: ${payload.topic}` : null,
      payload.source ? `Source: ${payload.source}` : null,
      "",
      payload.message,
    ].filter((row): row is string => Boolean(row));

    const ticket = await tx.ticket.create({
      data: {
        userId: contactUser.id,
        createdByUserId: null,
        title: ticketTitleByIntent[payload.intent],
        summary: detailRows.join("\n"),
        priority: payload.intent === "demo" || payload.intent === "org_registration" ? "HIGH" : "MEDIUM",
        category: payload.intent === "demo" || payload.intent === "org_registration" ? "ONBOARDING" : "GENERAL",
      },
    });

    await tx.ticketEvent.create({
      data: {
        ticketId: ticket.id,
        actorId: contactUser.id,
        type: "PUBLIC_CONTACT_CREATED",
        event: `Public contact created via ${payload.source ?? "website"}`,
        payload: {
          intent: payload.intent,
          topic: payload.topic ?? null,
          phone: payload.phone ?? null,
          organization: payload.organization ?? null,
          organizationType: payload.organizationType ?? null,
        },
      },
    });

    if (recipientUserIds.length) {
      await tx.notification.createMany({
        data: recipientUserIds.map((userId) => ({
          userId,
          title: "New public contact message",
          body: `${payload.name} submitted a ${payload.intent.replace("_", " ")} request.`,
        })),
      });
    }

    await tx.auditLog.create({
      data: {
        scope: "PLATFORM",
        userId: contactUser.id,
        action: "PUBLIC_CONTACT_MESSAGE_RECEIVED",
        metadata: {
          ticketId: ticket.id,
          intent: payload.intent,
          topic: payload.topic ?? null,
          source: payload.source ?? "website",
          notifiedUsers: recipientUserIds.length,
        },
      },
    });

    return { ticketId: ticket.id };
  });

  const subject = `[InternFlow] ${ticketTitleByIntent[payload.intent]} (${created.ticketId})`;
  const emailBody = [
    `A new public contact request has been submitted.`,
    `Ticket ID: ${created.ticketId}`,
    `Intent: ${payload.intent}`,
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    payload.phone ? `Phone: ${payload.phone}` : null,
    payload.organization ? `Organization: ${payload.organization}` : null,
    payload.organizationType ? `Organization type: ${payload.organizationType}` : null,
    payload.topic ? `Topic: ${payload.topic}` : null,
    payload.source ? `Source: ${payload.source}` : null,
    "",
    "Message:",
    payload.message,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  const [mailResult, whatsappWebhook] = await Promise.all([
    withTimeout(
      sendPlatformEmailMany(recipientEmails, subject, emailBody),
      12_000,
      { delivered: false },
    ),
    withTimeout(
      sendWhatsAppWebhook({
        ticketId: created.ticketId,
        intent: payload.intent,
        name: payload.name,
        email: payload.email,
        phone: payload.phone ?? null,
        organization: payload.organization ?? null,
        organizationType: payload.organizationType ?? null,
        topic: payload.topic ?? null,
        source: payload.source ?? "website",
        message: payload.message,
      }),
      7_000,
      "failed" as const,
    ),
  ]);

  return NextResponse.json({
    ok: true,
    ticketId: created.ticketId,
    message: "Thanks, your message has been received by the InternFlow team.",
    notification: {
      emailDelivered: mailResult.delivered,
      whatsappWebhook,
    },
  });
}
