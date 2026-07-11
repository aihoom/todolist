import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { handleApiError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const workspaces = await prisma.workspace.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        slug: true,
        inviteCode: true,
        createdAt: true,
        owner: { select: { id: true, email: true, name: true } },
        _count: { select: { members: true, todos: true } },
      },
    });
    return jsonOk({ workspaces });
  } catch (error) {
    return handleApiError(error);
  }
}
