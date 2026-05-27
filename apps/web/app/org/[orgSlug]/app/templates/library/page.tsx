import Link from "next/link";
import { requireTenantAccess } from "@/lib/tenant-portal";

const TEMPLATE_LIBRARY = [
  {
    id: "induction-register",
    name: "Induction register",
    description: "Capture learner induction attendance with facilitator and coordinator sign-off.",
  },
  {
    id: "attendance-register",
    name: "Daily attendance register",
    description: "Track daily presence, absentee reasons, and evidence references.",
  },
  {
    id: "stipend-schedule",
    name: "Stipend schedule",
    description: "Track payment eligibility, amount, status, and proof-of-payment references.",
  },
  {
    id: "document-checklist",
    name: "Document checklist",
    description: "Monitor required documents and verification decision history.",
  },
  {
    id: "cost-capture",
    name: "Cost capture sheet",
    description: "Capture provider/facilitator costs (transport, PPE, venue, certification, etc.).",
  },
  {
    id: "follow-up-tracer",
    name: "Follow-up tracer",
    description: "Capture 3/6/12 month post-training outcomes and evidence references.",
  },
] as const;

export default async function TemplateLibraryPage({ params }: { params: { orgSlug: string } }) {
  await requireTenantAccess(params.orgSlug);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Audit template library</h1>
        <p className="mt-1 text-sm text-slate-600">
          Download practical CSV templates for monthly provider operations and audit submissions.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {TEMPLATE_LIBRARY.map((template) => (
          <article key={template.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-900">{template.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{template.description}</p>
            <div className="mt-3 flex gap-2">
              <a
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                href={`/api/org/${params.orgSlug}/template-library/${template.id}`}
              >
                Download CSV
              </a>
              <Link
                href={`/org/${params.orgSlug}/app/reports/exports`}
                className="rounded border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-100"
              >
                Open exports
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
