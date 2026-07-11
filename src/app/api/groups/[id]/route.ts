import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { assertCanAccessGroup } from "@/lib/groups";
import { publishWorkspace } from "@/lib/realtime";
import { touchWorkspace } from "@/lib/todos";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().trim().min(1, "请填写分组名称").max(40).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await prisma.todoGroup.findUnique({ where: { id } });
    if (!existing) return jsonError("分组不存在", 404);

    await assertCanAccessGroup(existing, user.id);
    const body = updateSchema.parse(await request.json());

    const group = await prisma.todoGroup.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      },
      include: { _count: { select: { todos: true } } },
    });

    if (group.workspaceId) {
      await touchWorkspace(group.workspaceId);
      publishWorkspace(group.workspaceId, { type: "group.updated", group });
    }

    return jsonOk({ group });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await prisma.todoGroup.findUnique({
      where: { id },
      include: { _count: { select: { todos: true } } },
    });
    if (!existing) return jsonError("分组不存在", 404);

    await assertCanAccessGroup(existing, user.id);

    // onDelete SetNull：组内待办变为未分组
    await prisma.todoGroup.delete({ where: { id } });

    if (existing.workspaceId) {
      await touchWorkspace(existing.workspaceId);
      publishWorkspace(existing.workspaceId, {
        type: "group.deleted",
        groupId: id,
      });
    }

    return jsonOk({
      ok: true,
      ungroupedTodos: existing._count.todos,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
