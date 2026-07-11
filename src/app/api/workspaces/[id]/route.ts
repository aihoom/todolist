import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertWorkspaceMember, userPublicSelect } from "@/lib/workspace";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { sortTodos, todoInclude } from "@/lib/todos";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await assertWorkspaceMember(id, user.id);

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

    if (!workspace) {
      return jsonError("工作区不存在", 404);
    }

    return jsonOk({
      workspace: {
        ...workspace,
        todos: sortTodos(workspace.todos),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
