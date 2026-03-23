import { prisma } from "@internflow/db/src";
import { requireTenantAccess } from "@/lib/tenant-portal";
import { CloseoutExportsPanel } from "@/components/tenant/closeout-exports-panel";

export default async function ExportsPage({ params }: { params: { orgSlug: string } }) {
  const access = await requireTenantAccess(params.orgSlug);

  const [programmes, templates, jobs] = await Promise.all([
    prisma.program.findMany({
      where: { organizationId: access.membership.organizationId },
      orderBy: { startDate: "desc" }
    }),
    prisma.exportTemplate.findMany({
      where: { tenantId: access.membership.organizationId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.programmeExportJob.findMany({
      where: { tenantId: access.membership.organizationId },
      include: { programme: true, exportTemplate: true },
      orderBy: { createdAt: "desc" },
      take: 25
    })
  ]);

  const safeProgrammes = programmes.map((programme) => ({ ...programme, startDate: programme.startDate.toISOString(), endDate: programme.endDate.toISOString() }));

  const safeJobs = jobs.map((job) => ({
    ...job,
    createdAt: job.createdAt.toISOString(),
    finishedAt: job.finishedAt?.toISOString() ?? null
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Programme Close-Out Exports</h1>
      <a
        href={`/api/org/${params.orgSlug}/exports/foundation`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
      >
        Open export foundation summary (JSON)
      </a>
      <CloseoutExportsPanel orgSlug={params.orgSlug} programmes={safeProgrammes} templates={templates} initialJobs={safeJobs} />
    </div>
  );
}
