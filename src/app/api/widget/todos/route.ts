import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api";
import { sortTodos, todoInclude } from "@/lib/todos";

const MAX_ITEMS = 100;

export async function GET() {
  try {
    const user = await requireUser();

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
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
    > = [{ workspaceId: null, createdById: user.id }];
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

    const sorted = sortTodos(todos).slice(0, MAX_ITEMS);

    const items = sorted.map((todo) => {
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

    return jsonOk({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
