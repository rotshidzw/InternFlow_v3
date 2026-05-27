import { prisma } from "@internflow/db/src";
import Link from "next/link";
import { requireTenantAccess } from "@/lib/tenant-portal";

export default async function ProgramsPage({
  params,
}: {
  params: { orgSlug: string };
}) {
  const access = await requireTenantAccess(params.orgSlug);
  const programs = await prisma.program.findMany({
    where: { organizationId: access.membership.organizationId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { opportunities: true, enrollments: true } },
    } as any,
  });

  return (
    <div className="if-auth-page">
      <section className="if-auth-hero">
        <p className="text-xs uppercase tracking-[0.16em] text-brand-accentStrong">Programme Setup</p>
        <h1 className="if-auth-title mt-2">Programs</h1>
        <p className="if-auth-subtitle">
          Create and maintain structured training tracks used by opportunities, enrollments, and compliance workflows.
        </p>
      </section>

      <form
        action={`/api/org/${params.orgSlug}/programs`}
        method="post"
        className="if-auth-form if-filter-grid md:grid-cols-5"
      >
        <input
          required
          name="name"
          placeholder="Program name"
          className="rounded px-2 py-2 text-sm md:col-span-2"
        />
        <input
          name="setaCetaName"
          placeholder="SETA/CETA"
          className="rounded px-2 py-2 text-sm"
        />
        <input
          name="startDate"
          type="date"
          className="rounded px-2 py-2 text-sm"
        />
        <input
          name="endDate"
          type="date"
          className="rounded px-2 py-2 text-sm"
        />
        <textarea
          name="description"
          placeholder="Description"
          className="rounded px-2 py-2 text-sm md:col-span-4"
        />
        <button className="if-btn if-btn-primary px-3 py-2 text-sm">
          Create Program
        </button>
      </form>

      <div className="space-y-2">
        {programs.map((program: any) => (
          <Link
            key={program.id}
            href={`/org/${params.orgSlug}/app/programs/${program.id}`}
            className="if-panel-muted block rounded-xl border border-brand-border/55 p-3 transition hover:border-brand-accent/40 hover:bg-brand-surface"
          >
            <p className="font-medium text-brand-text">{program.name}</p>
            <p className="text-sm text-brand-textSoft">{program.description || "No description provided."}</p>
            <p className="text-xs text-brand-muted">
              Opportunities: {program._count.opportunities} - Enrollments: {program._count.enrollments}
            </p>
          </Link>
        ))}
        {programs.length === 0 ? (
          <p className="if-empty-state text-sm">No programmes created yet. Add your first programme above.</p>
        ) : null}
      </div>
    </div>
  );
}
