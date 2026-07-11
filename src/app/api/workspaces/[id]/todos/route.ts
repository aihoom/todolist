import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertWorkspaceMember } from "@/lib/workspace";
import { handleApiError, jsonOk } from "@/lib/api";
import { parseOptionalDate } from "@/lib/dates";
import { todoInclude, touchWorkspace } from "@/lib/todos";
import { publishWorkspace } from "@/lib/realtime";
import { notifyWorkspaceMembers, startDueReminderLoop } from "@/lib/notify";
import { resolveGroupIdForScope } from "@/lib/groups";

startDueReminderLoop();

type Params = { params: Promise<{ id: string }> };

const createSchema = z.object({
  title: z.string().trim().min(1, "请填写待办标题").max(200, "标题太长了"),
  description: z
    .string()
    .trim()
    .max(1000, "描述太长了")
    .optional()
    .or(z.literal("")),
  dueAt: z.string().optional().nullable(),
  groupId: z.string().nullable().optional(),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id: workspaceId } = await params;
    await assertWorkspaceMember(workspaceId, user.id);

    const body = createSchema.parse(await request.json());
    let dueAt: Date | null = null;
    try {
      dueAt = parseOptionalDate(body.dueAt) ?? null;
    } catch {
      return handleApiError(new Error("截止日期格式不正确"));
    }

    const groupId =
      (await resolveGroupIdForScope(body.groupId, {
        kind: "workspace",
        workspaceId,
        userId: user.id,
      })) ?? null;

    const todo = await prisma.todo.create({
      data: {
        title: body.title,
        description: body.description || null,
        dueAt,
        dueNotified: false,
        workspaceId,
        groupId,
        createdById: user.id,
      },
      include: todoInclude,
    });

    await touchWorkspace(workspaceId);
    publishWorkspace(workspaceId, { type: "todo.created", todo });

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });

    void notifyWorkspaceMembers(workspaceId, user.id, {
      title: `新待办 · ${workspace?.name ?? "工作区"}`,
      body: `${user.name} 添加了「${todo.title}」`,
      url: `/workspace/${workspaceId}`,
      event: "todo.created",
    });

    return jsonOk({ todo }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
