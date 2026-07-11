import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { ProfileClient } from "@/components/profile-client";
import { getVapidPublicKey } from "@/lib/notify/webpush";
import { profileSelect, toProfileUser } from "@/lib/profile";
import { getSiteSettings } from "@/lib/site-settings";

export default async function ProfilePage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const [user, domains, ownedWorkspaces, me, platform] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.id },
      select: profileSelect,
    }),
    prisma.customDomain.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workspace.findMany({
      where: { ownerId: session.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: session.id },
      select: { defaultWorkspaceId: true },
    }),
    getSiteSettings(),
  ]);

  return (
    <div className="min-h-screen">
      <AppHeader user={session} />
      <ProfileClient
        initialUser={toProfileUser(user)}
        vapidConfigured={Boolean(getVapidPublicKey())}
        domains={domains.map((d) => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
        }))}
        ownedWorkspaces={ownedWorkspaces}
        defaultWorkspaceId={me.defaultWorkspaceId}
        platformCnameTarget={platform.platformCnameTarget}
      />
    </div>
  );
}
