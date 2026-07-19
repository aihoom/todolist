import { prisma } from "@/lib/prisma";
import { sortTodos } from "@/lib/todos";

export type CalendarFeedSettings = {
  calendarIncludePersonal: boolean;
  calendarWorkspaceIds: string;
  calendarIncludeCompleted: boolean;
};

export function parseCalendarWorkspaceIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && x.length > 0);
  } catch {
    return [];
  }
}

export function serializeCalendarWorkspaceIds(ids: string[]): string {
  const unique = [...new Set(ids.filter(Boolean))];
  return JSON.stringify(unique);
}

export type FeedTodo = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  dueAt: Date;
  workspaceId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  workspace?: { id: string; name: string } | null;
};

/**
 * 按用户日历配置收集有截止日期的待办。
 * 工作区 ID 会过滤为当前仍是成员的。
 */
export async function getTodosForCalendarFeed(
  userId: string,
  settings: CalendarFeedSettings
): Promise<FeedTodo[]> {
  const workspaceIds = parseCalendarWorkspaceIds(settings.calendarWorkspaceIds);
  const completedFilter = settings.calendarIncludeCompleted
    ? {}
    : { completed: false };

  const memberships =
    workspaceIds.length > 0
      ? await prisma.workspaceMember.findMany({
          where: {
            userId,
            workspaceId: { in: workspaceIds },
          },
          select: { workspaceId: true },
        })
      : [];
  const allowedWorkspaceIds = memberships.map((m) => m.workspaceId);

  const or: Array<
    | { workspaceId: null; createdById: string }
    | { workspaceId: { in: string[] } }
  > = [];

  if (settings.calendarIncludePersonal) {
    or.push({ workspaceId: null, createdById: userId });
  }
  if (allowedWorkspaceIds.length > 0) {
    or.push({ workspaceId: { in: allowedWorkspaceIds } });
  }

  if (or.length === 0) {
    return [];
  }

  const todos = await prisma.todo.findMany({
    where: {
      dueAt: { not: null },
      ...completedFilter,
      OR: or,
    },
    select: {
      id: true,
      title: true,
      description: true,
      completed: true,
      dueAt: true,
      workspaceId: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
      workspace: { select: { id: true, name: true } },
    },
    take: 500,
  });

  // dueAt 已保证非 null
  const withDue = todos.filter(
    (t): t is typeof t & { dueAt: Date } => t.dueAt != null
  );
  return sortTodos(withDue) as FeedTodo[];
}

export function getAppBaseUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function feedUrlForToken(token: string): {
  httpsUrl: string;
  webcalUrl: string;
} {
  const base = getAppBaseUrl();
  const path = `/api/calendar/feed/${encodeURIComponent(token)}`;
  const httpsUrl = `${base}${path}`;
  const webcalUrl = httpsUrl.replace(/^https:/i, "webcal:").replace(/^http:/i, "webcal:");
  return { httpsUrl, webcalUrl };
}
