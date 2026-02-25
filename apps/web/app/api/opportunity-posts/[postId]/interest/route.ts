import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { postId: string } },
) {
  const email = cookies().get("if_user")?.value;
  if (!email) return NextResponse.redirect(new URL("/auth", req.url));

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) return NextResponse.redirect(new URL("/auth", req.url));

  const post = await prisma.opportunityPost.findUnique({
    where: { id: params.postId },
  });
  if (!post)
    return NextResponse.redirect(
      new URL("/explore?error=post-not-found", req.url),
    );

  await prisma.interest.upsert({
    where: { postId_userId: { postId: post.id, userId: user.id } },
    update: {},
    create: { postId: post.id, userId: user.id },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: post.tenantId,
      userId: user.id,
      action: "OPPORTUNITY_INTEREST_CREATED",
      entityType: "OpportunityPost",
      entityId: post.id,
    },
  });

  return NextResponse.redirect(new URL("/explore?interest=1", req.url));
}
