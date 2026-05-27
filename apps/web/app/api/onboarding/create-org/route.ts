import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  type: z.enum(["COMPANY", "TRAINING_PROVIDER", "NGO", "UNIVERSITY", "GOVERNMENT_PROGRAM"]),
  country: z.string().min(2),
  province: z.string().min(2),
  contactPerson: z.string().min(2)
});

export async function POST(req: Request) {
  const email = cookies().get("if_user")?.value;
  if (!email) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });

  const slug = `${parsed.data.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
  const org = await prisma.organization.create({
    data: {
      name: parsed.data.name,
      slug,
      type: parsed.data.type,
      country: parsed.data.country,
      province: parsed.data.province,
      contactPerson: parsed.data.contactPerson,
      createdBy: user.id,
      status: "PENDING_REVIEW"
    }
  });

  await prisma.membership.create({
    data: {
      userId: user.id,
      organizationId: org.id,
      role: "PROVIDER_ADMIN"
    }
  });

  cookies().set("if_workspace", org.slug, { path: "/", sameSite: "lax" });

  return NextResponse.json({ ok: true, orgSlug: org.slug });
}
