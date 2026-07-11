import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api";
import { listPersonalGroups } from "@/lib/groups";

const createSchema = z.object({
  name: z.string().trim().min(1, "请填写分组名称").max(40, "名称太长了"),
});

export async function GET() {
  try {
    const user = await requireUser();
    const groups = await listPersonalGroups(user.id);
    return jsonOk({ groups });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = createSchema.parse(await request.json());

    const maxOrder = await prisma.todoGroup.aggregate({
      where: { ownerId: user.id, workspaceId: null },
      _max: { sortOrder: true },
    });

    const group = await prisma.todoGroup.create({
      data: {
        name: body.name,
        workspaceId: null,
        ownerId: user.id,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
      include: { _count: { select: { todos: true } } },
    });

    return jsonOk({ group }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
