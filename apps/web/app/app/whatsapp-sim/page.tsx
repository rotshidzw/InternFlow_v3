import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

const actions = [
  { value: "status", label: "Check status" },
  { value: "upload", label: "Upload document" },
  { value: "payslip", label: "Request payslip" },
  { value: "certificate", label: "Request certificate" },
  { value: "support", label: "Open support ticket" },
];

export default async function WhatsAppSimPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const [platformMembership, tenantMembership] = await Promise.all([
    prisma.platformMembership.findFirst({ where: { userId: user.id } }),
    prisma.membership.findFirst({
      where: { userId: user.id },
      include: { organization: true },
    }),
  ]);

  if (platformMembership) {
    redirect("/hq/dashboard");
  }

  if (!tenantMembership) {
    redirect("/workspaces");
  }

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
            body: `Hi ${user.name ?? "there"}. Upload your onboarding documents here. Files go through OCR + scan checks before verification.`,
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
            Track conversation history, upload compliance docs, and send support
            requests in one feed.
          </p>
        </div>
        <Link
          href="/app/student"
          className="inline-flex rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
        >
          ← Back to Student Portal
        </Link>
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
              <span className="text-slate-300">Tenant:</span>{" "}
              {tenantMembership.organization.name}
            </p>
            <p>
              <span className="text-slate-300">Role:</span>{" "}
              {tenantMembership.role}
            </p>
          </div>
          <p className="mt-3 text-xs text-cyan-100">Discussion shortcuts:</p>
          <div className="mt-2 grid gap-2">
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

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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

          <form
            action="/api/whatsapp/messages"
            method="post"
            encType="multipart/form-data"
            className="mt-4 grid gap-2 rounded-2xl border border-white/20 bg-slate-900/35 p-3 md:grid-cols-4"
          >
            <input type="hidden" name="threadId" value={thread.id} />
            <input type="hidden" name="body" value="upload" />
            <select
              name="docType"
              className="rounded-xl border border-white/30 bg-slate-950/70 px-2 py-2 text-sm md:col-span-1"
            >
              <option value="ID">ID</option>
              <option value="CV">CV</option>
              <option value="CERTIFICATE">Certificate</option>
              <option value="PROOF_OF_ADDRESS">Proof of Address</option>
              <option value="PAYSLIP">Payslip</option>
            </select>
            <input
              type="file"
              name="file"
              required
              className="rounded-xl border border-white/30 bg-slate-950/70 px-2 py-2 text-sm md:col-span-2"
            />
            <button className="rounded-xl bg-emerald-600 px-3 py-2 font-semibold text-white">
              Upload + OCR scan
            </button>
          </form>

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
