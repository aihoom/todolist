import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/lib/prisma";
import { AdminUsersClient } from "@/components/admin-users-client";

export default async function AdminUsersPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          ownedWorkspaces: true,
          memberships: true,
          customDomains: true,
        },
      },
    },
  });

  return (
    <AdminShell admin={admin}>
      <h1 className="mb-1 text-2xl font-bold">用户管理</h1>
      <p className="mb-6 text-sm text-muted">禁用后用户无法登录</p>
      <AdminUsersClient
        initialUsers={users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        }))}
        currentAdminId={admin.id}
      />
    </AdminShell>
  );
}
