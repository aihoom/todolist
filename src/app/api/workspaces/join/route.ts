import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { countPersonalOpenTodos, getPersonalTodos } from "@/lib/todos";

const schema = z.object({
  inviteCode: z
    .string()
    .trim()
    .min(4, "邀请码无效")
    .max(16, "邀请码无效")
    .transform((v) => v.toUpperCase()),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await request.json());

    const workspace = await prisma.workspace.findUnique({
      where: { inviteCode: body.inviteCode },
      select: { id: true, name: true },
    });
    if (!workspace) {
      return jsonError("邀请码不存在或已失效", 404);
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
    });

    let alreadyMember = false;
    if (existing) {
      alreadyMember = true;
    } else {
      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: "member",
        },
      });
    }

    // 返回私人未完成待办，供前端弹出「是否同步」
    const personalOpenCount = await countPersonalOpenTodos(user.id);
    const personalTodos =
      personalOpenCount > 0
        ? (await getPersonalTodos(user.id)).filter((t) => !t.completed)
        : [];

    return jsonOk(
      {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        alreadyMember,
        personalOpenCount,
        personalTodos,
      },
      alreadyMember ? 200 : 201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
