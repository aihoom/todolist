import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceBySlug } from "@/lib/domain";
import { AppHeader } from "@/components/app-header";
import { WorkspaceClient } from "@/components/workspace-client";
import type { WorkspaceSummary } from "@/lib/types";
import { userPublicSelect } from "@/lib/workspace";
import { sortTodos, todoInclude } from "@/lib/todos";
import { isReservedSlug } from "@/lib/slug";

type Params = { params: Promise<{ slug: string }> };

/**
 * 主站短链：/w/{slug}
 * 无自定义域名时也可用工作区后缀访问
 */
export default async function PlatformSlugPage({ params }: Params) {
  const { slug: raw } = await params;
  const slug = raw.toLowerCase();
  if (isReservedSlug(slug)) notFound();

  const found = await resolveWorkspaceBySlug(slug);
  if (!found) notFound();

  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/w/${slug}`)}`);
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: found.id,
        userId: user.id,
      },
    },
  });
  if (!membership) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <h1 className="text-xl font-bold">无权访问</h1>
        <p className="mt-2 text-sm text-muted">
          你不是该工作区成员。请联系创建者获取邀请码。
        </p>
        <Link href="/dashboard" className="mt-4 text-primary hover:underline">
          返回首页
        </Link>
      </main>
    );
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: found.id },
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

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <WorkspaceClient
        initialWorkspace={
          {
            ...workspace,
            todos: sortTodos(workspace.todos),
          } as unknown as WorkspaceSummary
        }
        currentUserId={user.id}
        platformBaseUrl={process.env.APP_URL || ""}
      />
    </div>
  );
}
