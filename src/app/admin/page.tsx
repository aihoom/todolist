import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [users, workspaces, todos, domainsActive, domainsPending, invites, usersToday] =
    await Promise.all([
      prisma.user.count(),
      prisma.workspace.count(),
      prisma.todo.count(),
      prisma.customDomain.count({ where: { status: "active" } }),
      prisma.customDomain.count({ where: { status: "pending" } }),
      prisma.inviteLink.count({ where: { active: true } }),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
    ]);

  const cards = [
    { label: "用户总数", value: users, href: "/admin/users" },
    { label: "今日新增用户", value: usersToday, href: "/admin/users" },
    { label: "工作区", value: workspaces, href: "/admin/workspaces" },
    { label: "待办总数", value: todos, href: "/admin/workspaces" },
    { label: "域名已生效", value: domainsActive, href: "/admin/domains" },
    { label: "域名待验证", value: domainsPending, href: "/admin/domains" },
    { label: "有效邀请链接", value: invites, href: "/admin/invites" },
  ];

  return (
    <AdminShell admin={admin}>
      <h1 className="mb-1 text-2xl font-bold text-stone-900">仪表盘</h1>
      <p className="mb-6 text-sm text-muted">平台运营一览（一期免费）</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card className="p-5 transition hover:border-teal-300">
              <div className="text-sm text-muted">{c.label}</div>
              <div className="mt-2 text-3xl font-bold text-stone-900">
                {c.value}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
