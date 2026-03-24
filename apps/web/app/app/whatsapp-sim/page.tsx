import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { resolveStudentTenantContext } from "@/lib/student-tenant-context";

const actions = [
  { value: "status", label: "Check program status" },
  { value: "payslip", label: "Request payslip" },
  { value: "certificate", label: "Unlock certificate" },
  { value: "support", label: "Open support ticket" },
];

export default async function WhatsAppSimPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const [platformMembership, tenantMembership, documents] = await Promise.all([
    prisma.platformMembership.findFirst({ where: { userId: user.id } }),
    prisma.membership.findFirst({
      where: { userId: user.id },
      include: { organization: true },
    }),
    prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  if (platformMembership) {
    redirect("/hq/dashboard");
  }

  if (!tenantMembership) {
    redirect("/workspaces");
  }
  const context = await resolveStudentTenantContext(user.id);
  const placementLabel =
    context.type === "ENROLLED" &&
    ["PENDING", "ACTIVE", "COMPLETED"].includes(context.enrollment.status)
      ? context.enrollment.organizationName
      : "Placement not assigned";

  let thread = await prisma.chatThread.findFirst({
    where: { userId: user.id },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 120 } },
  });
  if (!thread) {
    thread = await prisma.chatThread.create({
      data: {
        userId: user.id,
        title: `WhatsApp Sim ${user.email}`,
        messages: {
          create: {
            role: "SYSTEM",
            body: `Hi ${user.name ?? "there"}. This space is for discussions and support. For uploads, open the Documents page.`,
          },
        },
      },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 120 } },
    });
  }

  return (
    <div className="space-y-4 rounded-3xl border border-indigo-200/70 bg-[linear-gradient(135deg,#0f172a_0%,#1e1b4b_35%,#0e7490_100%)] p-4 text-white shadow-2xl shadow-indigo-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/20 bg-slate-950/35 p-4 backdrop-blur-md">
        <div>
          <h1 className="text-lg font-semibold">
            Student Discussions & Support
          </h1>
          <p className="text-xs text-cyan-100">
            Ask questions, request support, and follow updates. Document uploads are handled in the Documents page.
          </p>
        </div>
        <Link
          href="/app/student"
          className="inline-flex rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
        >
          ← Back to Student Portal
        </Link>
        <form action="/api/auth/logout" method="post">
          <button className="inline-flex rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20">
            Log out
          </button>
        </form>
      </div>

      <div className="grid h-[78vh] grid-cols-1 gap-3 md:grid-cols-[300px_1fr]">
        <aside className="rounded-2xl border border-white/20 bg-slate-950/35 p-4 backdrop-blur-md">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-100">
            Student Profile
          </h2>
          <div className="mt-3 space-y-2 rounded-xl border border-white/15 bg-slate-900/40 p-3 text-sm">
            <p>
              <span className="text-slate-300">Name:</span> {user.name ?? "N/A"}
            </p>
            <p>
              <span className="text-slate-300">Email:</span> {user.email}
            </p>
            <p>
              <span className="text-slate-300">Provider/Placement:</span>{" "}
              {placementLabel}
            </p>
            <p>
              <span className="text-slate-300">Role:</span>{" "}
              {tenantMembership.role}
            </p>
          </div>
          <p className="mt-3 text-xs text-cyan-100">Discussion shortcuts:</p>
          <div className="mt-2 grid gap-2">
            <Link
              href="/app/student/documents"
              className="rounded-lg border border-emerald-300 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30"
            >
              Go to Documents
            </Link>
            <Link
              href="/app/whatsapp-sim"
              className="rounded-lg border border-white/30 bg-white/5 px-3 py-2 text-xs hover:bg-white/15"
            >
              Raise concern
            </Link>
            <Link
              href="/app/student"
              className="rounded-lg border border-white/30 bg-white/5 px-3 py-2 text-xs hover:bg-white/15"
            >
              Dashboard
            </Link>
          </div>

          <div className="mt-4 rounded-xl border border-white/20 bg-slate-900/40 p-3 text-xs">
            <p className="font-semibold text-cyan-100">Documents summary</p>
            <p className="mt-1 text-slate-300">
              {documents.filter((d) => ["APPROVED", "SCAN_OK", "SUBMITTED", "SCAN_PENDING"].includes(d.status)).length}
              {" "}
              uploaded/processing ·{" "}
              {documents.filter((d) => d.status === "REJECTED" || d.status === "SCAN_FAILED").length}
              {" "}
              need attention
            </p>
            <div className="mt-2 space-y-1">
              {documents.length === 0 && <p className="text-slate-300">No document updates yet.</p>}
              {documents.slice(0, 3).map((doc) => (
                <p key={doc.id} className="text-slate-200">
                  {doc.type}: {doc.status}
                  {doc.rejectionReason ? ` · ${doc.rejectionReason}` : ""}
                </p>
              ))}
            </div>
          </div>
        </aside>

        <section className="rounded-2xl border border-white/20 bg-slate-950/35 p-4 backdrop-blur-md">
          <h2 className="text-lg font-semibold">Discussion Thread</h2>
          <div className="mt-3 h-[42vh] space-y-2 overflow-y-auto rounded-xl border border-white/20 bg-slate-900/50 p-3">
            {thread.messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-xl rounded-2xl px-3 py-2 text-sm shadow ${m.role === "USER" ? "ml-auto bg-emerald-200 text-slate-900" : "bg-white text-slate-900"}`}
              >
                {m.body}
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {actions.map((action) => (
              <form
                key={action.value}
                action="/api/whatsapp/messages"
                method="post"
              >
                <input type="hidden" name="threadId" value={thread.id} />
                <input type="hidden" name="body" value={action.value} />
                <button className="w-full rounded-xl border border-white/30 bg-white/5 px-3 py-2 text-sm hover:bg-white/15">
                  {action.label}
                </button>
              </form>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-emerald-200/40 bg-emerald-500/10 p-3 text-sm text-emerald-50">
            Documents are managed on a dedicated page so you can see required items, processing status, and verification outcomes clearly.
            <div className="mt-2">
              <Link
                href="/app/student/documents"
                className="inline-flex rounded-lg border border-emerald-300 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Open Documents
              </Link>
            </div>
          </div>

          <form
            action="/api/whatsapp/messages"
            method="post"
            className="mt-4 flex gap-2"
          >
            <input type="hidden" name="threadId" value={thread.id} />
            <input
              type="text"
              name="body"
              className="flex-1 rounded-xl border border-white/30 bg-slate-950/70 px-3 py-2"
              placeholder="Type custom message"
            />
            <button className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white">
              Send
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
