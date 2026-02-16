import { HQShell } from "@/components/hq/hq-shell";
import { requirePlatformAccess } from "@/lib/hq/auth";

export default async function HQLayout({ children }: { children: React.ReactNode }) {
  const { user, platformMembership } = await requirePlatformAccess();
  return <HQShell role={platformMembership.role} userEmail={user.email}>{children}</HQShell>;
}
