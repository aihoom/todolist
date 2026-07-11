import { prisma } from "./prisma";
import { AuthError } from "./auth";
import { assertWorkspaceMember } from "./workspace";

export type GroupScope =
  | { kind: "personal"; userId: string }
  | { kind: "workspace"; workspaceId: string; userId: string };

export async function assertCanAccessGroup(
  group: { workspaceId: string | null; ownerId: string },
  userId: string
) {
  if (!group.workspaceId) {
    if (group.ownerId !== userId) {
      throw new AuthError("无权操作该私人分组", 403);
    }
    return { personal: true as const };
  }
  await assertWorkspaceMember(group.workspaceId, userId);
  return { personal: false as const, workspaceId: group.workspaceId };
}

/** 校验 groupId 是否属于当前作用域，合法则返回 groupId，否则抛错 */
export async function resolveGroupIdForScope(
  groupId: string | null | undefined,
  scope: GroupScope
): Promise<string | null | undefined> {
  if (groupId === undefined) return undefined;
  if (groupId === null || groupId === "") return null;

  const group = await prisma.todoGroup.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new AuthError("分组不存在", 404);
  }

  if (scope.kind === "personal") {
    if (group.workspaceId !== null || group.ownerId !== scope.userId) {
      throw new AuthError("分组不属于你的私人清单", 400);
    }
  } else {
    if (group.workspaceId !== scope.workspaceId) {
      throw new AuthError("分组不属于当前工作区", 400);
    }
    await assertWorkspaceMember(scope.workspaceId, scope.userId);
  }

  return group.id;
}

export async function listPersonalGroups(userId: string) {
  return prisma.todoGroup.findMany({
    where: { ownerId: userId, workspaceId: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { todos: true } } },
  });
}

export async function listWorkspaceGroups(workspaceId: string) {
  return prisma.todoGroup.findMany({
    where: { workspaceId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { todos: true } } },
  });
}
