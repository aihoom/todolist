import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api";
import { syncPersonalTodosToWorkspace } from "@/lib/todos";
import { publishWorkspace } from "@/lib/realtime";
import { notifyWorkspaceMembers } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  /** 指定私人待办 id；不传则同步全部符合条件的 */
  todoIds: z.array(z.string()).optional(),
  onlyOpen: z.boolean().optional().default(true),
  removeFromPersonal: z.boolean().optional().default(false),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id: workspaceId } = await params;
    const body = schema.parse(await request.json().catch(() => ({})));

    const result = await syncPersonalTodosToWorkspace({
      userId: user.id,
      workspaceId,
      todoIds: body.todoIds,
      onlyOpen: body.onlyOpen,
      removeFromPersonal: body.removeFromPersonal,
    });

    for (const todo of result.todos) {
      publishWorkspace(workspaceId, { type: "todo.created", todo });
    }

    if (result.synced > 0) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true },
      });
      void notifyWorkspaceMembers(workspaceId, user.id, {
        title: `同步待办 · ${workspace?.name ?? "工作区"}`,
        body: `${user.name} 从私人清单同步了 ${result.synced} 条待办`,
        url: `/workspace/${workspaceId}`,
        event: "todo.created",
      });
    }

    return jsonOk({
      synced: result.synced,
      todos: result.todos,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
