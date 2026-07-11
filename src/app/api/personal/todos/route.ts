import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api";
import { parseOptionalDate } from "@/lib/dates";
import { getPersonalTodos, todoInclude } from "@/lib/todos";
import { resolveGroupIdForScope } from "@/lib/groups";

const createSchema = z.object({
  title: z.string().trim().min(1, "请填写待办标题").max(200, "标题太长了"),
  description: z
    .string()
    .trim()
    .max(20000, "备注太长了（支持 Markdown，上限约 2 万字）")
    .optional()
    .or(z.literal("")),
  dueAt: z.string().optional().nullable(),
  groupId: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const todos = await getPersonalTodos(user.id);
    return jsonOk({ todos });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = createSchema.parse(await request.json());

    let dueAt: Date | null = null;
    try {
      dueAt = parseOptionalDate(body.dueAt) ?? null;
    } catch {
      return handleApiError(new Error("截止日期格式不正确"));
    }

    const groupId =
      (await resolveGroupIdForScope(body.groupId, {
        kind: "personal",
        userId: user.id,
      })) ?? null;

    const todo = await prisma.todo.create({
      data: {
        title: body.title,
        description: body.description || null,
        dueAt,
        dueNotified: false,
        workspaceId: null,
        groupId,
        createdById: user.id,
      },
      include: todoInclude,
    });

    return jsonOk({ todo }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
