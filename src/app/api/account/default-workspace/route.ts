import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

const schema = z.object({
  workspaceId: z.string().min(1).nullable(),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await request.json());

    if (body.workspaceId) {
      const ws = await prisma.workspace.findFirst({
        where: { id: body.workspaceId, ownerId: user.id },
      });
      if (!ws) {
        return jsonError("只能将自己创建的工作区设为默认落地", 400);
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { defaultWorkspaceId: body.workspaceId },
      select: { id: true, defaultWorkspaceId: true },
    });

    return jsonOk({ user: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
