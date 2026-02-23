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
    <div className="mx-auto max-w-5xl px-4 py-10 text-white">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
            Explore
          </p>
          <h1 className="text-3xl font-semibold">Public opportunities</h1>
          <p className="mt-1 text-sm text-slate-300">
            Open posts from approved tenants. Express interest even before
            joining a tenant.
          </p>
        </div>
        <Link
          href="/onboarding/profile"
          className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
        >
          Edit profile
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {posts.map((post) => (
          <article
            key={post.id}
            className="rounded-2xl border border-white/15 bg-white/5 p-4"
          >
            <p className="text-xs uppercase tracking-[0.15em] text-emerald-300">
              {post.tenant.name}
            </p>
            <h2 className="mt-1 text-xl font-semibold">{post.title}</h2>
            <p className="mt-2 text-sm text-slate-200">{post.description}</p>
            <p className="mt-2 text-xs text-slate-400">
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
        <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          No public opportunities available right now.
        </p>
      )}
    </div>
  );
}
