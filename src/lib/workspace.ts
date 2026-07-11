import { prisma } from "./prisma";
import { AuthError } from "./auth";

export const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
} as const;

export async function assertWorkspaceMember(
  workspaceId: string,
  userId: string
) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
  });
  if (!membership) {
    throw new AuthError("你不是该工作区的成员", 403);
  }
  return membership;
}

export async function getUserWorkspaces(userId: string) {
  return prisma.workspace.findMany({
    where: {
      members: { some: { userId } },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      members: {
        include: {
          user: { select: userPublicSelect },
        },
        orderBy: { joinedAt: "asc" },
      },
      _count: { select: { todos: true } },
    },
  });
}
