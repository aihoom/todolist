import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/lib/prisma";
import { AdminInvitesClient } from "@/components/admin-invites-client";

export default async function AdminInvitesPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const invites = await prisma.inviteLink.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";

  return (
    <AdminShell admin={admin}>
      <h1 className="mb-1 text-2xl font-bold">邀请链接</h1>
      <p className="mb-6 text-sm text-muted">
        非强制注册；有邀请码注册会统计使用次数
      </p>
      <AdminInvitesClient
        appUrl={appUrl}
        initialInvites={invites.map((i) => ({
          ...i,
          createdAt: i.createdAt.toISOString(),
          expiresAt: i.expiresAt?.toISOString() ?? null,
        }))}
      />
    </AdminShell>
  );
}
