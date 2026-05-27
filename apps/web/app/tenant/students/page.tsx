import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ALLOWED_ROLES = new Set(["PROVIDER_ADMIN", "COORDINATOR"]);

export default async function TenantStudentsPage({
  searchParams,
}: {
  searchParams?: { skills?: string; location?: string; keyword?: string };
}) {
  const email = cookies().get("if_user")?.value;
  const workspaceSlug = cookies().get("if_workspace")?.value;
  if (!email || !workspaceSlug) redirect("/workspaces");

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) redirect("/auth");

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, organization: { slug: workspaceSlug } },
    include: { organization: true },
  });
  if (!membership || !ALLOWED_ROLES.has(membership.role))
    redirect(`/org/${workspaceSlug}/app`);

  const skills = (searchParams?.skills ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const location = (searchParams?.location ?? "").trim();
  const keyword = (searchParams?.keyword ?? "").trim();

  const students = await prisma.studentProfile.findMany({
    where: {
      isDiscoverable: true,
      ...(skills.length ? { skills: { hasSome: skills } } : {}),
      ...(location
        ? { location: { contains: location, mode: "insensitive" } }
        : {}),
      ...(keyword
        ? {
            OR: [
              { fullName: { contains: keyword, mode: "insensitive" } },
              { bio: { contains: keyword, mode: "insensitive" } },
              { skills: { has: keyword } },
            ],
          }
        : {}),
    },
    include: { user: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-white">
      <h1 className="text-3xl font-semibold">Discover students</h1>
      <p className="mt-1 text-sm text-slate-300">
        Only students who opted into discoverability are shown.
      </p>

      <form className="mt-4 grid gap-2 rounded-xl border border-white/20 bg-white/5 p-3 md:grid-cols-4">
        <input
          name="skills"
          defaultValue={searchParams?.skills ?? ""}
          placeholder="skills, e.g. react,node"
          className="rounded border border-white/20 bg-slate-950/40 px-2 py-2 text-sm"
        />
        <input
          name="location"
          defaultValue={searchParams?.location ?? ""}
          placeholder="location"
          className="rounded border border-white/20 bg-slate-950/40 px-2 py-2 text-sm"
        />
        <input
          name="keyword"
          defaultValue={searchParams?.keyword ?? ""}
          placeholder="keyword"
          className="rounded border border-white/20 bg-slate-950/40 px-2 py-2 text-sm"
        />
        <button className="rounded border border-emerald-300/40 px-3 py-2 text-sm text-emerald-200">
          Search
        </button>
      </form>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {students.map((student) => (
          <article
            key={student.id}
            className="rounded-xl border border-white/15 bg-white/5 p-4"
          >
            <h2 className="text-lg font-semibold">{student.fullName}</h2>
            <p className="text-sm text-slate-300">{student.user.email}</p>
            <p className="mt-1 text-sm text-slate-300">
              {student.location ?? "Location not provided"}
            </p>
            <p className="mt-2 text-sm">{student.bio ?? "No bio yet."}</p>
            <p className="mt-2 text-xs text-emerald-200">
              Skills: {student.skills.join(", ") || "None listed"}
            </p>
            <form
              action={`/api/org/${workspaceSlug}/student-invites`}
              method="post"
              className="mt-3 grid gap-2 md:grid-cols-3"
            >
              <input type="hidden" name="maxUses" value="1" />
              <input
                name="expiresInDays"
                defaultValue="14"
                className="rounded border border-white/20 bg-slate-950/40 px-2 py-1 text-xs"
              />
              <input
                name="programmeId"
                placeholder="Programme ID"
                className="rounded border border-white/20 bg-slate-950/40 px-2 py-1 text-xs"
              />
              <button className="rounded border border-white/20 px-2 py-1 text-xs">
                Invite to programme
              </button>
            </form>
          </article>
        ))}
      </div>
    </div>
  );
}
