export type PublicContactIntent = "general" | "demo" | "org_registration" | "chat";

export type PublicContactRequest = {
  name: string;
  email: string;
  message: string;
  phone?: string;
  topic?: string;
  organization?: string;
  organizationType?: string;
  intent?: PublicContactIntent;
  source?: string;
};

export type PublicContactResponse = {
  ok: boolean;
  ticketId?: string;
  message?: string;
  notification?: {
    emailDelivered: boolean;
    whatsappWebhook: "sent" | "skipped" | "failed";
  };
  error?: string;
};

export async function submitPublicContact(
  payload: PublicContactRequest,
): Promise<PublicContactResponse> {
  const response = await fetch("/api/public/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = (await response.json().catch(() => null)) as PublicContactResponse | null;
  if (!response.ok) {
    return json ?? { ok: false, error: "Unable to submit request right now." };
  }

  return json ?? { ok: true };
}
