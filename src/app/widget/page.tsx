import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sortTodos, todoInclude } from "@/lib/todos";
import { getSiteSettings } from "@/lib/site-settings";
import {
  WidgetClient,
  type WidgetTodoItem,
} from "@/components/widget-client";

const MAX_ITEMS = 100;

export default async function WidgetPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=/widget");

  const settings = await getSiteSettings();

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.id },
    select: {
      workspaceId: true,
      workspace: { select: { id: true, name: true } },
    },
  });
  const workspaceIds = memberships.map((m) => m.workspaceId);
  const nameByWs = new Map(
    memberships.map((m) => [m.workspace.id, m.workspace.name])
  );

  const or: Array<
    | { workspaceId: null; createdById: string }
    | { workspaceId: { in: string[] } }
  > = [{ workspaceId: null, createdById: session.id }];
  if (workspaceIds.length > 0) {
    or.push({ workspaceId: { in: workspaceIds } });
  }

  const todos = await prisma.todo.findMany({
    where: {
      completed: false,
      OR: or,
    },
    include: {
      ...todoInclude,
      workspace: { select: { id: true, name: true } },
    },
    take: MAX_ITEMS * 2,
  });

  const items: WidgetTodoItem[] = sortTodos(todos)
    .slice(0, MAX_ITEMS)
    .map((todo) => {
      const isPersonal = !todo.workspaceId;
      return {
        id: todo.id,
        title: todo.title,
        description: todo.description,
        completed: todo.completed,
        dueAt: todo.dueAt?.toISOString() ?? null,
        dueNotified: todo.dueNotified,
        workspaceId: todo.workspaceId,
        groupId: todo.groupId,
        createdById: todo.createdById,
        completedAt: todo.completedAt?.toISOString() ?? null,
        createdAt: todo.createdAt.toISOString(),
        updatedAt: todo.updatedAt.toISOString(),
        createdBy: todo.createdBy,
        group: todo.group,
        source: isPersonal ? ("personal" as const) : ("workspace" as const),
        workspaceName: isPersonal
          ? undefined
          : todo.workspace?.name ??
            nameByWs.get(todo.workspaceId!) ??
            "工作区",
      };
    });

  return (
    <WidgetClient initialItems={items} siteName={settings.siteName} />
  );
}
