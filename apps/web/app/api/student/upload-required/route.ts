import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/auth", req.url));

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.redirect(
      new URL("/app/student?error=missing-file", req.url),
    );
  }

  const storageKey = `uploads/${user.id}/${Date.now()}-${file.name}`;
  await getStorageAdapter().put(
    storageKey,
    Buffer.from(await file.arrayBuffer()),
    file.type || "application/octet-stream",
  );

  const activeEnrollment = await prisma.enrollment.findFirst({
    where: {
      userId: user.id,
      status: { in: ["PENDING", "ACTIVE", "COMPLETED"] },
    },
    orderBy: { id: "desc" },
    select: { organizationId: true },
  });

  await prisma.document.create({
    data: {
      userId: user.id,
      organizationId: activeEnrollment?.organizationId ?? null,
      type: "CV",
      status: "SUBMITTED",
      versions: {
        create: {
          storageKey,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        },
      },
    },
  });

  return NextResponse.redirect(
    new URL("/app/student?notice=cv-uploaded", req.url),
  );
}
