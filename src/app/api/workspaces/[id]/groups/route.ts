import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertWorkspaceMember } from "@/lib/workspace";
import { handleApiError, jsonOk } from "@/lib/api";
import { listWorkspaceGroups } from "@/lib/groups";
import { publishWorkspace } from "@/lib/realtime";
import { touchWorkspace } from "@/lib/todos";

type Params = { params: Promise<{ id: string }> };

const createSchema = z.object({
  name: z.string().trim().min(1, "请填写分组名称").max(40, "名称太长了"),
});

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id: workspaceId } = await params;
    await assertWorkspaceMember(workspaceId, user.id);
    const groups = await listWorkspaceGroups(workspaceId);
    return jsonOk({ groups });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id: workspaceId } = await params;
    await assertWorkspaceMember(workspaceId, user.id);
    const body = createSchema.parse(await request.json());

    const maxOrder = await prisma.todoGroup.aggregate({
      where: { workspaceId },
      _max: { sortOrder: true },
    });

    const group = await prisma.todoGroup.create({
      data: {
        name: body.name,
        workspaceId,
        ownerId: user.id,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
      include: { _count: { select: { todos: true } } },
    });

    await touchWorkspace(workspaceId);
    publishWorkspace(workspaceId, { type: "group.created", group });

    return jsonOk({ group }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
