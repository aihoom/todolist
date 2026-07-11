import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { parseOptionalDate } from "@/lib/dates";
import {
  assertCanAccessTodo,
  todoInclude,
  touchWorkspace,
} from "@/lib/todos";
import { publishWorkspace } from "@/lib/realtime";
import { notifyWorkspaceMembers } from "@/lib/notify";
import { resolveGroupIdForScope } from "@/lib/groups";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z
    .string()
    .trim()
    .max(20000, "备注太长了（支持 Markdown，上限约 2 万字）")
    .nullable()
    .optional(),
  completed: z.boolean().optional(),
  dueAt: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
});

async function getAccessibleTodo(todoId: string, userId: string) {
  const todo = await prisma.todo.findUnique({ where: { id: todoId } });
  if (!todo) return null;
  await assertCanAccessTodo(todo, userId);
  return todo;
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await getAccessibleTodo(id, user.id);
    if (!existing) {
      return jsonError("待办不存在", 404);
    }

    const body = updateSchema.parse(await request.json());
    const data: {
      title?: string;
      description?: string | null;
      completed?: boolean;
      completedAt?: Date | null;
      dueAt?: Date | null;
      dueNotified?: boolean;
      groupId?: string | null;
    } = {};

    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.completed !== undefined) {
      data.completed = body.completed;
      data.completedAt = body.completed ? new Date() : null;
    }
    if (body.dueAt !== undefined) {
      try {
        data.dueAt = parseOptionalDate(body.dueAt) ?? null;
        data.dueNotified = false;
      } catch {
        return jsonError("截止日期格式不正确", 400);
      }
    }
    if (body.groupId !== undefined) {
      const scope = existing.workspaceId
        ? {
            kind: "workspace" as const,
            workspaceId: existing.workspaceId,
            userId: user.id,
          }
        : { kind: "personal" as const, userId: user.id };
      data.groupId =
        (await resolveGroupIdForScope(body.groupId, scope)) ?? null;
    }

    const todo = await prisma.todo.update({
      where: { id },
      data,
      include: todoInclude,
    });

    if (todo.workspaceId) {
      await touchWorkspace(todo.workspaceId);
      publishWorkspace(todo.workspaceId, { type: "todo.updated", todo });

      if (body.completed === true && !existing.completed) {
        const workspace = await prisma.workspace.findUnique({
          where: { id: todo.workspaceId },
          select: { name: true },
        });
        void notifyWorkspaceMembers(todo.workspaceId, user.id, {
          title: `已完成 · ${workspace?.name ?? "工作区"}`,
          body: `${user.name} 完成了「${todo.title}」`,
          url: `/workspace/${todo.workspaceId}`,
          event: "todo.completed",
        });
      }
    }

    return jsonOk({ todo });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await getAccessibleTodo(id, user.id);
    if (!existing) {
      return jsonError("待办不存在", 404);
    }

    await prisma.todo.delete({ where: { id } });

    if (existing.workspaceId) {
      await touchWorkspace(existing.workspaceId);
      publishWorkspace(existing.workspaceId, {
        type: "todo.deleted",
        todoId: id,
      });
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
