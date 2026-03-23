import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ExplorePage() {
  const email = cookies().get("if_user")?.value;
  if (!email) redirect("/auth");

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) redirect("/auth");

  const posts = await prisma.opportunityPost.findMany({
    where: {
      visibility: "PUBLIC",
      OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }],
    },
    include: { tenant: true },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const interests = await prisma.interest.findMany({
    where: { userId: user.id, postId: { in: posts.map((post) => post.id) } },
  });
  const interested = new Set(interests.map((interest) => interest.postId));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 text-slate-900 dark:text-white">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            Explore
          </p>
          <h1 className="text-3xl font-semibold">Public opportunities</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Open posts from approved tenants. Express interest even before
            joining a tenant.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/app/student/profile"
            className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-300/40 dark:text-emerald-200 dark:hover:bg-emerald-500/10"
          >
            Open profile
          </Link>
          <Link
            href="/onboarding/profile"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10"
          >
            Edit profile
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {posts.map((post) => (
          <article
            key={post.id}
            className="rounded-2xl border border-slate-200 bg-white/85 p-4 dark:border-white/15 dark:bg-white/5"
          >
            <p className="text-xs uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
              {post.tenant.name}
            </p>
            <h2 className="mt-1 text-xl font-semibold">{post.title}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-200">
              {post.description}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Closes:{" "}
              {post.closesAt
                ? post.closesAt.toISOString().slice(0, 10)
                : "Open"}
            </p>
            <form
              action={`/api/opportunity-posts/${post.id}/interest`}
              method="post"
              className="mt-4"
            >
              <button
                disabled={interested.has(post.id)}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
              >
                {interested.has(post.id) ? "Interest sent" : "Express interest"}
              </button>
            </form>
          </article>
        ))}
      </div>

      {posts.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          No public opportunities available right now.
        </p>
      )}
    </div>
  );
}
