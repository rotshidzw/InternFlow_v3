import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getStorageAdapter } from "@internflow/shared/src/storage";

export async function POST(req: Request) {
  const email = cookies().get("if_user")?.value;
  if (!email) return NextResponse.redirect(new URL("/auth", req.url));

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
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

  await prisma.document.create({
    data: {
      userId: user.id,
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
