import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, writeAudit } from "@/lib/admin";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        defaultWorkspaceId: true,
        ownedWorkspaces: {
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
            _count: { select: { members: true, todos: true } },
          },
        },
        customDomains: true,
      },
    });
    if (!user) return jsonError("用户不存在", 404);
    return jsonOk({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  status: z.enum(["active", "disabled"]).optional(),
  role: z.enum(["user", "admin"]).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    if (id === admin.id) {
      return jsonError("不能修改自己的角色/状态", 400);
    }
    const body = patchSchema.parse(await request.json());
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.role ? { role: body.role } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });
    await writeAudit(admin.id, "user.update", "user", id, body);
    return jsonOk({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
