import { prisma } from "@internflow/db/src";
import { documentUploadSchema } from "@internflow/shared/src/schemas";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { NextResponse } from "next/server";
import { Queue } from "bullmq";
import { cookies } from "next/headers";
import { createRedisClient } from "@/lib/redis-queue";
import { getCurrentUser } from "@/lib/session";

const expiryByType: Record<string, number | null> = {
  ID: 3650,
  CV: null,
  QUALIFICATION: null,
  CERTIFICATE: 90,
  AFFIDAVIT: 90,
  PROOF_OF_ADDRESS: 90,
  BANK_CONFIRMATION: 90,
  SIGNED_CONSENT: 3650,
  PAYSLIP: 30,
  APPLICATION_SUPPORTING_DOC: null,
};

const redisConnection = createRedisClient("api-doc-upload");
const scanQueue = new Queue("document-scan", { connection: redisConnection });

function computeExpiration(type: string) {
  const days = expiryByType[type];
  if (!days) return null;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

type DocumentTargetContext = {
  userId: string;
  organizationId: string | null;
};

async function resolveDocumentTargetContext(
  inputUserId: string | undefined,
  actorUserId: string,
): Promise<DocumentTargetContext | null> {
  const workspaceSlug = cookies().get("if_workspace")?.value ?? null;
  const actorMemberships = await prisma.membership.findMany({
    where: { userId: actorUserId, organization: { status: "APPROVED" } },
    include: { organization: { select: { slug: true } } },
  });
  const actorOrgIds = actorMemberships.map((membership) => membership.organizationId);
  const workspaceMembership = workspaceSlug
    ? actorMemberships.find((membership) => membership.organization.slug === workspaceSlug)
    : null;

  const targetUserId = !inputUserId || inputUserId === actorUserId ? actorUserId : inputUserId;

  if (targetUserId === actorUserId) {
    const activeEnrollment = await prisma.enrollment.findFirst({
      where: {
        userId: actorUserId,
        status: { in: ["PENDING", "ACTIVE", "COMPLETED"] },
      },
      orderBy: { id: "desc" },
      select: { organizationId: true },
    });

    return {
      userId: actorUserId,
      organizationId:
        activeEnrollment?.organizationId ??
        workspaceMembership?.organizationId ??
        (actorMemberships.length === 1 ? actorMemberships[0].organizationId : null),
    };
  }

  const canUploadForOthers = actorMemberships.some((membership) =>
    ["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR", "TRAINER", "FACILITATOR", "SYSTEM_ADMIN"].includes(
      membership.role,
    ),
  );
  if (!canUploadForOthers || actorOrgIds.length === 0) return null;

  const targetMemberships = await prisma.membership.findMany({
    where: {
      userId: targetUserId,
      organizationId: { in: actorOrgIds },
      organization: { status: "APPROVED" },
    },
    select: { organizationId: true },
  });
  if (targetMemberships.length === 0) return null;

  const resolvedOrganizationId =
    workspaceMembership &&
    targetMemberships.some((membership) => membership.organizationId === workspaceMembership.organizationId)
      ? workspaceMembership.organizationId
      : targetMemberships[0].organizationId;

  return {
    userId: targetUserId,
    organizationId: resolvedOrganizationId,
  };
}

async function enqueueScanOrFallback(args: {
  documentId: string;
  mimeType: string;
  sizeBytes: number;
  fileName: string;
  userId: string;
  tenantId?: string | null;
}) {
  try {
    await scanQueue.add("scanDocument", {
      documentId: args.documentId,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      fileName: args.fileName,
    });
    return;
  } catch (error) {
    await prisma.document.update({
      where: { id: args.documentId },
      data: { status: "SUBMITTED", rejectionReason: "Scan queue unavailable; manual review required." },
    });

    await prisma.auditEvent.create({
      data: {
        userId: args.userId,
        tenantId: args.tenantId ?? undefined,
        action: "DOCUMENT_SCAN_QUEUE_FAILED",
        entityType: "Document",
        entityId: args.documentId,
        metadata: { error: error instanceof Error ? error.message : "Unknown queue error" },
      },
    });
  }
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  const storage = getStorageAdapter();
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file");
    const redirectTo = String(formData.get("redirectTo") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const parsed = documentUploadSchema.safeParse({
      userId: String(formData.get("userId") ?? "") || undefined,
      type: String(formData.get("type") ?? ""),
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      selfCertified: formData.get("selfCertified") === "true",
    });

    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const target = await resolveDocumentTargetContext(parsed.data.userId, actor.id);
    if (!target) return NextResponse.json({ error: "Missing user context" }, { status: 403 });

    const storageKey = `uploads/${target.userId}/${Date.now()}-${parsed.data.fileName}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await storage.put(storageKey, bytes, parsed.data.mimeType);

    const document = await prisma.document.create({
      data: {
        userId: target.userId,
        organizationId: target.organizationId,
        type: parsed.data.type,
        status: "SCAN_PENDING",
        expirationDate: computeExpiration(parsed.data.type),
        selfCertifiedAt: parsed.data.selfCertified ? new Date() : null,
        versions: {
          create: {
            storageKey,
            mimeType: parsed.data.mimeType,
            sizeBytes: parsed.data.sizeBytes,
          },
        },
      },
      include: { versions: true },
    });

    await enqueueScanOrFallback({
      documentId: document.id,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      fileName: parsed.data.fileName,
      userId: target.userId,
      tenantId: target.organizationId,
    });

    await prisma.auditEvent.create({
      data: {
        userId: target.userId,
        tenantId: target.organizationId ?? undefined,
        action: "DOCUMENT_UPLOADED",
        entityType: "Document",
        entityId: document.id,
        metadata: {
          type: parsed.data.type,
          storageKey,
          mimeType: parsed.data.mimeType,
          sizeBytes: parsed.data.sizeBytes,
        },
      },
    });

    if (redirectTo.startsWith("/")) {
      const url = new URL(redirectTo, req.url);
      url.searchParams.set("uploaded", parsed.data.type);
      url.searchParams.set("status", document.status);
      return NextResponse.redirect(url);
    }

    return NextResponse.json({ ok: true, verification: document.status, expiryDays: expiryByType[parsed.data.type], documentId: document.id, storageKey });
  }

  const payload = await req.json();
  const parsed = documentUploadSchema.safeParse({
    ...payload,
    sizeBytes: Number(payload.sizeBytes ?? 1024),
    selfCertified: payload.selfCertified === true || payload.selfCertified === "true",
  });

  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const target = await resolveDocumentTargetContext(parsed.data.userId, actor.id);
  if (!target) return NextResponse.json({ error: "Missing user context" }, { status: 403 });

  const storageKey = `uploads/${target.userId}/${Date.now()}-${parsed.data.fileName}`;
  await storage.put(storageKey, Buffer.from("InternFlow placeholder file"), parsed.data.mimeType);

  const document = await prisma.document.create({
    data: {
      userId: target.userId,
      organizationId: target.organizationId,
      type: parsed.data.type,
      status: "SCAN_PENDING",
      expirationDate: computeExpiration(parsed.data.type),
      selfCertifiedAt: parsed.data.selfCertified ? new Date() : null,
      versions: {
        create: {
          storageKey,
          mimeType: parsed.data.mimeType,
          sizeBytes: parsed.data.sizeBytes,
        },
      },
    },
    include: { versions: true },
  });

  await enqueueScanOrFallback({
    documentId: document.id,
    mimeType: parsed.data.mimeType,
    sizeBytes: parsed.data.sizeBytes,
    fileName: parsed.data.fileName,
    userId: target.userId,
    tenantId: target.organizationId,
  });

  await prisma.auditEvent.create({
    data: {
      userId: target.userId,
      tenantId: target.organizationId ?? undefined,
      action: "DOCUMENT_UPLOADED",
      entityType: "Document",
      entityId: document.id,
      metadata: {
        type: parsed.data.type,
        storageKey,
        mimeType: parsed.data.mimeType,
        sizeBytes: parsed.data.sizeBytes,
      },
    },
  });

  return NextResponse.json({ ok: true, verification: document.status, expiryDays: expiryByType[parsed.data.type], documentId: document.id, storageKey });
}
