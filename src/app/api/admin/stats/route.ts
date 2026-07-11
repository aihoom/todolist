import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { handleApiError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      users,
      workspaces,
      todos,
      domainsActive,
      domainsPending,
      invites,
      usersToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.workspace.count(),
      prisma.todo.count(),
      prisma.customDomain.count({ where: { status: "active" } }),
      prisma.customDomain.count({ where: { status: "pending" } }),
      prisma.inviteLink.count({ where: { active: true } }),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
    ]);

    return jsonOk({
      stats: {
        users,
        workspaces,
        todos,
        domainsActive,
        domainsPending,
        invites,
        usersToday,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
