import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";

export default async function AdminWorkspacesPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      slug: true,
      inviteCode: true,
      createdAt: true,
      owner: { select: { email: true, name: true } },
      _count: { select: { members: true, todos: true } },
    },
  });

  return (
    <AdminShell admin={admin}>
      <h1 className="mb-1 text-2xl font-bold">工作区一览</h1>
      <p className="mb-6 text-sm text-muted">含路径后缀 slug</p>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-stone-50 text-xs text-muted">
            <tr>
              <th className="px-4 py-3">名称</th>
              <th className="px-4 py-3">slug</th>
              <th className="px-4 py-3">所有者</th>
              <th className="px-4 py-3">成员</th>
              <th className="px-4 py-3">待办</th>
              <th className="px-4 py-3">创建时间</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((w) => (
              <tr key={w.id} className="border-b border-border/70">
                <td className="px-4 py-3 font-medium">{w.name}</td>
                <td className="px-4 py-3 font-mono text-xs">/{w.slug}</td>
                <td className="px-4 py-3">
                  <div>{w.owner.name}</div>
                  <div className="text-xs text-muted">{w.owner.email}</div>
                </td>
                <td className="px-4 py-3">{w._count.members}</td>
                <td className="px-4 py-3">{w._count.todos}</td>
                <td className="px-4 py-3 text-xs text-muted">
                  {w.createdAt.toLocaleString("zh-CN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </AdminShell>
  );
}
