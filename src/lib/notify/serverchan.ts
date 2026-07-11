import type { NotifyChannel, NotifyPayload, NotifyUser } from "./types";

/**
 * Server酱 Turbo 推送通道
 * API: https://sctapi.ftqq.com/{SendKey}.send
 * 文档: https://sct.ftqq.com/
 */
export const serverChanChannel: NotifyChannel = {
  id: "serverchan",
  name: "Server酱",

  async send(user: NotifyUser, payload: NotifyPayload) {
    const key = user.serverChanKey?.trim();
    if (!key) return;

    const title = payload.title.slice(0, 100);
    const lines = [payload.body];
    if (payload.url) {
      const base = process.env.APP_URL?.replace(/\/$/, "") ?? "";
      lines.push("", `[打开 TodoPlan](${base}${payload.url})`);
    }
    const desp = lines.join("\n");

    const endpoint = `https://sctapi.ftqq.com/${encodeURIComponent(key)}.send`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, desp }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[serverchan] failed", res.status, text);
      }
    } catch (err) {
      console.error("[serverchan] error", err);
    }
  },
};

/** 测试 Server酱 SendKey 是否可用 */
export async function testServerChanKey(
  sendKey: string
): Promise<{ ok: boolean; message: string }> {
  const key = sendKey.trim();
  if (!key) {
    return { ok: false, message: "请填写 SendKey" };
  }

  const endpoint = `https://sctapi.ftqq.com/${encodeURIComponent(key)}.send`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "TodoPlan 测试推送",
        desp: "恭喜，Server酱 已成功对接 TodoPlan！",
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      code?: number;
      message?: string;
      info?: string;
    };
    if (res.ok && (data.code === 0 || data.code === undefined)) {
      return { ok: true, message: "测试推送已发送，请查看微信/客户端" };
    }
    return {
      ok: false,
      message: data.message || data.info || `推送失败 (${res.status})`,
    };
  } catch {
    return { ok: false, message: "网络错误，无法连接 Server酱" };
  }
}
