import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api";
import { assertCanAccessTodo } from "@/lib/todos";
import { getAppBaseUrl } from "@/lib/calendar/feed-todos";
import {
  buildIcsCalendar,
  icsResponse,
  todoToIcsEvent,
} from "@/lib/calendar/ics";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const todo = await prisma.todo.findUnique({ where: { id } });
    if (!todo) {
      return jsonError("待办不存在", 404);
    }
    await assertCanAccessTodo(todo, user.id);

    if (!todo.dueAt) {
      return jsonError("该待办没有截止日期，无法加入日历", 400);
    }

    const event = todoToIcsEvent(
      {
        id: todo.id,
        title: todo.title,
        description: todo.description,
        dueAt: todo.dueAt,
        updatedAt: todo.updatedAt,
        workspaceId: todo.workspaceId,
      },
      { appBaseUrl: getAppBaseUrl() }
    );

    const body = buildIcsCalendar({
      name: "TodoPlan",
      events: [event],
    });

    return icsResponse(body, `todo-${todo.id}.ics`);
  } catch (error) {
    return handleApiError(error);
  }
}
