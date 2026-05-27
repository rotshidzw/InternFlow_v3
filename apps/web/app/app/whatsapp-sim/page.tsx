import Link from "next/link";
import { prisma } from "@internflow/db/src";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { resolveStudentTenantContext } from "@/lib/student-tenant-context";
import {
  ArrowLeft,
  FileText,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  MessageSquareText,
  Send,
  Sparkles,
  WalletCards,
} from "lucide-react";

type WhatsAppSimPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const actions = [
  {
    value: "status",
    label: "Check program status",
    description: "Get your latest placement and programme state.",
    icon: Sparkles,
  },
  {
    value: "payslip",
    label: "Request payslip",
    description: "Ask for the latest stipend payment record.",
    icon: WalletCards,
  },
  {
    value: "certificate",
    label: "Unlock certificate",
    description: "Check certificate release and eligibility status.",
    icon: LockKeyhole,
  },
  {
    value: "support",
    label: "Open support ticket",
    description: "Create a tracked support request for follow-up.",
    icon: LifeBuoy,
  },
];

function formatDate(value: Date) {
  return value.toISOString().replace("T", " ").slice(0, 16);
}

function roleLabel(role: string) {
  if (role === "USER") return "You";
  if (role === "SYSTEM") return "Support assistant";
  return role;
}

export default async function WhatsAppSimPage({ searchParams }: WhatsAppSimPageProps) {
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
  const programmeLabel =
    context.type === "ENROLLED"
      ? context.enrollment.programName
      : context.type === "APPLICATION"
        ? context.application.opportunityTitle
        : "Not linked yet";

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

  const uploadedOrProcessingCount = documents.filter((document) =>
    ["APPROVED", "SCAN_OK", "SUBMITTED", "SCAN_PENDING"].includes(document.status),
  ).length;
  const attentionCount = documents.filter((document) =>
    ["REJECTED", "SCAN_FAILED"].includes(document.status),
  ).length;
  const messageError = searchParams?.error === "message-failed";

  return (
    <div className="if-auth-page min-h-[calc(100vh-7rem)] p-4 md:p-6">
      <section className="if-auth-hero p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.16em] text-brand-accentStrong">
              Student Support Workspace
            </p>
            <h1 className="if-auth-title">Discussions and support</h1>
            <p className="if-auth-subtitle max-w-2xl">
              Ask questions, request help, and track support responses. Document uploads remain in the dedicated Documents page.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/app/student" className="if-btn if-btn-secondary if-btn-nav text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Student Portal
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className="if-btn if-btn-secondary if-btn-nav text-xs">
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </form>
          </div>
        </div>
        {messageError ? (
          <p className="if-status if-status-warning mt-3">
            Message failed to send. Please try again.
          </p>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <aside className="if-panel rounded-2xl p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-accentStrong">
            Student profile
          </h2>
          <div className="if-panel-muted mt-3 space-y-2 rounded-xl p-3 text-sm">
            <p className="text-brand-textSoft">
              <span className="text-brand-muted">Name:</span> {user.name ?? "N/A"}
            </p>
            <p className="text-brand-textSoft">
              <span className="text-brand-muted">Email:</span> {user.email}
            </p>
            <p className="text-brand-textSoft">
              <span className="text-brand-muted">Placement:</span> {placementLabel}
            </p>
            <p className="text-brand-textSoft">
              <span className="text-brand-muted">Programme:</span> {programmeLabel}
            </p>
            <p className="text-brand-textSoft">
              <span className="text-brand-muted">Role:</span> {tenantMembership.role}
            </p>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-xs uppercase tracking-[0.13em] text-brand-muted">
              Shortcuts
            </p>
            <Link href="/app/student/documents" className="if-btn if-btn-primary w-full justify-start text-xs">
              <FileText className="h-3.5 w-3.5" />
              Go to Documents
            </Link>
            <Link href="/app/student" className="if-btn if-btn-secondary w-full justify-start text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Open dashboard
            </Link>
          </div>

          <div className="if-panel-muted mt-4 rounded-xl p-3 text-xs">
            <p className="font-semibold uppercase tracking-[0.13em] text-brand-accentStrong">
              Document summary
            </p>
            <p className="mt-1 text-brand-textSoft">
              {uploadedOrProcessingCount} uploaded or processing - {attentionCount} need attention
            </p>
            <div className="mt-2 space-y-1">
              {documents.length === 0 ? (
                <p className="text-brand-muted">No document updates yet.</p>
              ) : (
                documents.slice(0, 3).map((document) => (
                  <p key={document.id} className="text-brand-textSoft">
                    {document.type}: {document.status}
                    {document.rejectionReason ? ` - ${document.rejectionReason}` : ""}
                  </p>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="if-panel rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-brand-text">
              <MessageSquareText className="h-4 w-4 text-brand-accentStrong" />
              Discussion thread
            </h2>
            <span className="if-status if-status-draft">
              {thread.messages.length} messages
            </span>
          </div>

          <div className="if-panel-muted mt-3 h-[44vh] space-y-3 overflow-y-auto rounded-xl border border-brand-border/55 p-3 md:p-4">
            {thread.messages.map((message) => {
              const isUser = message.role === "USER";
              return (
                <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <article
                    className={`max-w-[90%] rounded-2xl border px-3 py-2 text-sm md:max-w-[78%] ${
                      isUser
                        ? "border-violet-300/35 bg-gradient-to-br from-violet-500/92 to-indigo-500/90 text-white shadow-[0_10px_28px_rgba(99,102,241,0.35)]"
                        : "border-brand-border/55 bg-[#121d3e] text-brand-textSoft"
                    }`}
                  >
                    <p className={`text-[11px] uppercase tracking-[0.12em] ${isUser ? "text-violet-100/90" : "text-brand-muted"}`}>
                      {roleLabel(message.role)} - {formatDate(message.createdAt)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed">{message.body}</p>
                  </article>
                </div>
              );
            })}
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.13em] text-brand-muted">Quick actions</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {actions.map((action) => (
                <form key={action.value} action="/api/whatsapp/messages" method="post">
                  <input type="hidden" name="threadId" value={thread.id} />
                  <input type="hidden" name="body" value={action.value} />
                  <button className="if-btn if-btn-secondary w-full items-start justify-start gap-2 rounded-xl px-3 py-2.5 text-left text-sm">
                    <action.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-accentStrong" />
                    <span className="space-y-0.5">
                      <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-brand-text">
                        {action.label}
                      </span>
                      <span className="block text-[11px] font-normal text-brand-muted">
                        {action.description}
                      </span>
                    </span>
                  </button>
                </form>
              ))}
              <Link href="/app/student/documents" className="if-btn if-btn-primary w-full justify-start rounded-xl px-3 py-2.5 text-sm">
                <FileText className="h-3.5 w-3.5" />
                Open Documents
              </Link>
            </div>
          </div>

          <form action="/api/whatsapp/messages" method="post" className="mt-4">
            <input type="hidden" name="threadId" value={thread.id} />
            <div className="if-panel-muted flex items-center gap-2 rounded-xl border border-brand-border/60 p-2">
              <input
                type="text"
                name="body"
                className="h-11 flex-1 rounded-lg border border-brand-border/60 bg-[#0a132d] px-3 text-sm text-brand-text"
                placeholder="Type your message to support"
              />
              <button className="if-btn if-btn-primary h-11 px-4 text-sm font-semibold">
                <Send className="h-3.5 w-3.5" />
                Send
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
