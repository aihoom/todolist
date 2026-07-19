/** 生成 RFC 5545 兼容的 iCalendar 文本 */

export type IcsEvent = {
  uid: string;
  summary: string;
  description?: string;
  /** 事件开始（截止时刻前 1 小时） */
  start: Date;
  /** 事件结束（= 截止日期） */
  end: Date;
  url?: string;
  /** 最后修改时间 */
  lastModified?: Date;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** UTC 格式：20260711T123000Z */
export function formatIcsUtc(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** 转义 TEXT 属性值 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/** 折叠长行（RFC 5545：每行 ≤75 八位组，续行前加空格） */
export function foldIcsLine(line: string): string {
  const max = 75;
  if (line.length <= max) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, max));
  rest = rest.slice(max);
  while (rest.length > 0) {
    const chunk = rest.slice(0, max - 1);
    parts.push(` ${chunk}`);
    rest = rest.slice(max - 1);
  }
  return parts.join("\r\n");
}

/** 去掉 Markdown 标记，得到日历 DESCRIPTION 用的纯文本 */
export function plainTextFromMarkdown(source: string | null | undefined): string {
  if (!source) return "";
  return source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

export function buildIcsCalendar(options: {
  name: string;
  events: IcsEvent[];
  productId?: string;
}): string {
  const productId = options.productId ?? "-//TodoPlan//Calendar//CN";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${productId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(options.name)}`,
  ];

  for (const ev of options.events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.uid}`);
    lines.push(`DTSTAMP:${formatIcsUtc(ev.lastModified ?? new Date())}`);
    lines.push(`DTSTART:${formatIcsUtc(ev.start)}`);
    lines.push(`DTEND:${formatIcsUtc(ev.end)}`);
    lines.push(`SUMMARY:${escapeIcsText(ev.summary)}`);
    if (ev.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
    }
    if (ev.url) {
      lines.push(`URL:${ev.url}`);
    }
    if (ev.lastModified) {
      lines.push(`LAST-MODIFIED:${formatIcsUtc(ev.lastModified)}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

export type TodoLikeForIcs = {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date;
  updatedAt?: Date;
  workspaceId: string | null;
};

/** 将带截止日期的待办转为 VEVENT（截止时刻为结束，前 1 小时为开始） */
export function todoToIcsEvent(
  todo: TodoLikeForIcs,
  options: { appBaseUrl: string }
): IcsEvent {
  const end = new Date(todo.dueAt);
  const start = new Date(end.getTime() - 60 * 60 * 1000);
  const path = todo.workspaceId
    ? `/workspace/${todo.workspaceId}`
    : "/personal";
  const base = options.appBaseUrl.replace(/\/$/, "");
  const desc = plainTextFromMarkdown(todo.description);

  return {
    uid: `todo-${todo.id}@todoplan`,
    summary: todo.title,
    description: desc || undefined,
    start,
    end,
    url: base ? `${base}${path}` : path,
    lastModified: todo.updatedAt,
  };
}

export function icsResponse(body: string, filename = "todoplan.ics") {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
