import { prisma } from "@/lib/prisma";
import type { NotifyChannel, NotifyPayload, NotifyUser } from "./types";
import { serverChanChannel } from "./serverchan";
import { webPushChannel } from "./webpush";

/**
 * 可插拔推送通道列表。
 * 以后要接钉钉/飞书/邮件等，实现 NotifyChannel 后 push 进来即可。
 */
const channels: NotifyChannel[] = [serverChanChannel, webPushChannel];

export function registerNotifyChannel(channel: NotifyChannel) {
  if (!channels.find((c) => c.id === channel.id)) {
    channels.push(channel);
  }
}

export function listNotifyChannels() {
  return channels.map((c) => ({ id: c.id, name: c.name }));
}

function shouldNotify(user: NotifyUser, payload: NotifyPayload): boolean {
  switch (payload.event) {
    case "todo.created":
      return user.notifyOnTodoCreate;
    case "todo.completed":
      return user.notifyOnTodoComplete;
    case "todo.due":
      return user.notifyOnDueSoon;
    case "test":
      return true;
    default:
      return true;
  }
}

async function sendToUser(user: NotifyUser, payload: NotifyPayload) {
  if (!shouldNotify(user, payload)) return;
  await Promise.all(channels.map((ch) => ch.send(user, payload)));
}

/**
 * 通知工作区其他成员（排除操作者自己）
 */
export async function notifyWorkspaceMembers(
  workspaceId: string,
  excludeUserId: string | null,
  payload: NotifyPayload
) {
  const members = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          serverChanKey: true,
          notifyOnTodoCreate: true,
          notifyOnTodoComplete: true,
          notifyOnDueSoon: true,
        },
      },
    },
  });

  await Promise.all(members.map((m) => sendToUser(m.user, payload)));
}

export async function notifyUserById(userId: string, payload: NotifyPayload) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      serverChanKey: true,
      notifyOnTodoCreate: true,
      notifyOnTodoComplete: true,
      notifyOnDueSoon: true,
    },
  });
  if (!user) return;
  await sendToUser(user, payload);
}

/**
 * 扫描即将到期/已逾期的未完成待办并推送（默认 2 小时内 + 已逾期未提醒的）
 */
export async function checkDueTodosAndNotify() {
  const now = new Date();
  const soon = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const todos = await prisma.todo.findMany({
    where: {
      completed: false,
      dueNotified: false,
      dueAt: { not: null, lte: soon },
    },
    include: {
      workspace: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
    take: 50,
  });

  for (const todo of todos) {
    const due = todo.dueAt!;
    const overdue = due.getTime() < now.getTime();
    const title = overdue
      ? `【已逾期】${todo.title}`
      : `【即将到期】${todo.title}`;

    if (todo.workspaceId && todo.workspace) {
      const body = overdue
        ? `工作区「${todo.workspace.name}」中的待办已过截止日期`
        : `工作区「${todo.workspace.name}」中的待办将在 2 小时内到期（创建者：${todo.createdBy.name}）`;

      await notifyWorkspaceMembers(todo.workspaceId, null, {
        title,
        body,
        url: `/workspace/${todo.workspaceId}`,
        event: "todo.due",
      });
    } else {
      // 私人待办只提醒创建者本人
      await notifyUserById(todo.createdById, {
        title,
        body: overdue
          ? `私人待办已过截止日期`
          : `私人待办将在 2 小时内到期`,
        url: "/personal",
        event: "todo.due",
      });
    }

    await prisma.todo.update({
      where: { id: todo.id },
      data: { dueNotified: true },
    });
  }

  return todos.length;
}

// 开发/单机：进程内定时扫描到期提醒
let dueTimer: ReturnType<typeof setInterval> | null = null;

export function startDueReminderLoop() {
  if (dueTimer || typeof setInterval === "undefined") return;
  dueTimer = setInterval(() => {
    checkDueTodosAndNotify().catch((err) =>
      console.error("[due-reminder]", err)
    );
  }, 60_000);
  // 启动后稍等再扫一次
  setTimeout(() => {
    checkDueTodosAndNotify().catch(() => {});
  }, 5000);
}
