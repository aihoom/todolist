/** 解析前端 datetime-local / ISO 字符串为 Date 或 null */
export function parseOptionalDate(
  value: string | null | undefined
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error("截止日期格式不正确");
  }
  return d;
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDueLabel(iso: string | null): {
  text: string;
  tone: "muted" | "warn" | "danger" | "ok";
} | null {
  if (!iso) return null;
  const due = new Date(iso);
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  const text = due.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (diff < 0) return { text: `已逾期 · ${text}`, tone: "danger" };
  if (diff < 2 * 60 * 60 * 1000)
    return { text: `即将到期 · ${text}`, tone: "warn" };
  if (diff < 24 * 60 * 60 * 1000)
    return { text: `今日 · ${text}`, tone: "warn" };
  return { text: `截止 ${text}`, tone: "muted" };
}
