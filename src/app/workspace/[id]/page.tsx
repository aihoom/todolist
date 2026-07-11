import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { WorkspaceClient } from "@/components/workspace-client";
import type { WorkspaceSummary } from "@/lib/types";
import { userPublicSelect } from "@/lib/workspace";
import { sortTodos, todoInclude } from "@/lib/todos";

type Params = { params: Promise<{ id: string }> };

export default async function WorkspacePage({ params }: Params) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId: id, userId: user.id },
    },
  });
  if (!membership) {
    notFound();
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      members: {
        include: {
          user: { select: userPublicSelect },
        },
        orderBy: { joinedAt: "asc" },
      },
      groups: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { _count: { select: { todos: true } } },
      },
      todos: {
        include: todoInclude,
      },
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
      <WorkspaceClient
        initialWorkspace={payload as unknown as WorkspaceSummary}
        currentUserId={user.id}
        platformBaseUrl={process.env.APP_URL || ""}
      />
    </div>
  );
}
