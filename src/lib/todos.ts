import { prisma } from "./prisma";
import { AuthError } from "./auth";
import { assertWorkspaceMember } from "./workspace";

export const todoInclude = {
  createdBy: {
    select: { id: true, name: true, avatarUrl: true },
  },
  group: {
    select: { id: true, name: true },
  },
} as const;

export function sortTodos<
  T extends { completed: boolean; dueAt: Date | null; createdAt: Date },
>(list: T[]) {
  return [...list].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.dueAt && b.dueAt) {
      return a.dueAt.getTime() - b.dueAt.getTime();
    }
    if (a.dueAt && !b.dueAt) return -1;
    if (!a.dueAt && b.dueAt) return 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export async function touchWorkspace(workspaceId: string | null | undefined) {
  if (!workspaceId) return;
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { updatedAt: new Date() },
  });
}

export async function assertCanAccessTodo(
  todo: { workspaceId: string | null; createdById: string },
  userId: string
) {
  if (!todo.workspaceId) {
    if (todo.createdById !== userId) {
      throw new AuthError("无权访问该私人待办", 403);
    }
    return { personal: true as const };
  }
  await assertWorkspaceMember(todo.workspaceId, userId);
  return { personal: false as const, workspaceId: todo.workspaceId };
}

export async function getPersonalTodos(userId: string) {
  const todos = await prisma.todo.findMany({
    where: { createdById: userId, workspaceId: null },
    include: todoInclude,
  });
  return sortTodos(todos);
}

export async function countPersonalOpenTodos(userId: string) {
  return prisma.todo.count({
    where: {
      createdById: userId,
      workspaceId: null,
      completed: false,
    },
  });
}

export async function syncPersonalTodosToWorkspace(options: {
  userId: string;
  workspaceId: string;
  todoIds?: string[] | null;
  onlyOpen?: boolean;
  removeFromPersonal?: boolean;
}) {
  const {
    userId,
    workspaceId,
    todoIds,
    onlyOpen = true,
    removeFromPersonal = false,
  } = options;

  await assertWorkspaceMember(workspaceId, userId);

  const where: {
    createdById: string;
    workspaceId: null;
    completed?: boolean;
    id?: { in: string[] };
  } = {
    createdById: userId,
    workspaceId: null,
  };
  if (onlyOpen) where.completed = false;
  if (todoIds && todoIds.length > 0) where.id = { in: todoIds };

  const personal = await prisma.todo.findMany({ where });
  if (personal.length === 0) {
    return {
      synced: 0,
      todos: [] as Awaited<
        ReturnType<
          typeof prisma.todo.findMany<{ include: typeof todoInclude }>
        >
      >,
    };
  }

  const created = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const t of personal) {
      // 同步到工作区时不带私人分组（分组作用域不同）
      const copy = await tx.todo.create({
        data: {
          title: t.title,
          description: t.description,
          completed: false,
          completedAt: null,
          dueAt: t.dueAt,
          dueNotified: false,
          workspaceId,
          groupId: null,
          createdById: userId,
        },
        include: todoInclude,
      });
      results.push(copy);
      if (removeFromPersonal) {
        await tx.todo.delete({ where: { id: t.id } });
      }
    }
    await tx.workspace.update({
      where: { id: workspaceId },
      data: { updatedAt: new Date() },
    });
    return results;
  });

  return { synced: created.length, todos: created };
}
