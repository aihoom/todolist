import { redirect, notFound } from "next/navigation";
import { resolveWorkspaceByHostAndPath } from "@/lib/domain";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { WorkspaceClient } from "@/components/workspace-client";
import type { WorkspaceSummary } from "@/lib/types";
import { userPublicSelect } from "@/lib/workspace";
import { sortTodos, todoInclude } from "@/lib/todos";
import Link from "next/link";

type Params = {
  params: Promise<{ host: string; slug?: string[] }>;
};

export default async function CustomDomainPage({ params }: Params) {
  const { host: hostEnc, slug: slugParts } = await params;
  const host = decodeURIComponent(hostEnc);
  const pathSlug = slugParts?.[0] ?? null;

  // 多级路径暂不支持
  if (slugParts && slugParts.length > 1) notFound();

  const resolved = await resolveWorkspaceByHostAndPath(host, pathSlug);
  if (!resolved) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <h1 className="text-xl font-bold">域名未生效</h1>
        <p className="mt-2 max-w-md text-center text-sm text-muted">
          {host} 尚未绑定或 DNS 验证未通过。请到 TodoPlan 账号设置中完成域名配置。
        </p>
      </main>
    );
  }

  if (!resolved.workspace) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <h1 className="text-xl font-bold">工作区不存在</h1>
        <p className="mt-2 text-sm text-muted">
          {pathSlug
            ? `路径 /${pathSlug} 没有对应工作区`
            : "账号下还没有可落地的工作区"}
        </p>
      </main>
    );
  }

  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?next=/workspace/${resolved.workspace.id}`);
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: resolved.workspace.id,
        userId: user.id,
      },
    },
  });
  if (!membership) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <h1 className="text-xl font-bold">无权访问</h1>
        <p className="mt-2 text-sm text-muted">
          你不是该工作区成员。请联系空间创建者获取邀请码。
        </p>
        <Link href="/dashboard" className="mt-4 text-primary hover:underline">
          返回主站
        </Link>
      </main>
    );
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: resolved.workspace.id },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      members: {
        include: { user: { select: userPublicSelect } },
        orderBy: { joinedAt: "asc" },
      },
      groups: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { _count: { select: { todos: true } } },
      },
      todos: { include: todoInclude },
    },
  });
  if (!workspace) notFound();

  const payload = {
    ...workspace,
    todos: sortTodos(workspace.todos),
  };

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <div className="border-b border-border bg-teal-50/80 px-4 py-1.5 text-center text-xs text-teal-900">
        自定义域名访问 · {host}
        {pathSlug ? `/${pathSlug}` : ""} · slug: {workspace.slug}
      </div>
      <WorkspaceClient
        initialWorkspace={payload as unknown as WorkspaceSummary}
        currentUserId={user.id}
        platformBaseUrl={process.env.APP_URL || ""}
      />
    </div>
  );
}
