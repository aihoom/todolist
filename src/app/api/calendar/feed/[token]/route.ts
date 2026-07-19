import { prisma } from "@/lib/prisma";
import {
  getAppBaseUrl,
  getTodosForCalendarFeed,
} from "@/lib/calendar/feed-todos";
import {
  buildIcsCalendar,
  icsResponse,
  todoToIcsEvent,
} from "@/lib/calendar/ics";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  if (!token || token.length < 16) {
    return new Response("Not found", { status: 404 });
  }

  const user = await prisma.user.findFirst({
    where: { calendarFeedToken: token, status: "active" },
    select: {
      id: true,
      name: true,
      calendarIncludePersonal: true,
      calendarWorkspaceIds: true,
      calendarIncludeCompleted: true,
    },
  });

  if (!user) {
    return new Response("Not found", { status: 404 });
  }

  const todos = await getTodosForCalendarFeed(user.id, {
    calendarIncludePersonal: user.calendarIncludePersonal,
    calendarWorkspaceIds: user.calendarWorkspaceIds,
    calendarIncludeCompleted: user.calendarIncludeCompleted,
  });

  const appBaseUrl = getAppBaseUrl();
  const events = todos.map((todo) =>
    todoToIcsEvent(
      {
        id: todo.id,
        title: todo.title,
        description: todo.description,
        dueAt: todo.dueAt,
        updatedAt: todo.updatedAt,
        workspaceId: todo.workspaceId,
      },
      { appBaseUrl }
    )
  );

  const body = buildIcsCalendar({
    name: `${user.name} 的 TodoPlan`,
    events,
  });

  return icsResponse(body, "todoplan.ics");
}
