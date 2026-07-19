"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Button, Card, ErrorBanner } from "./ui";

type WorkspaceOpt = { id: string; name: string };

type CalendarSettings = {
  enabled: boolean;
  includePersonal: boolean;
  includeCompleted: boolean;
  workspaceIds: string[];
  workspaces: WorkspaceOpt[];
  httpsUrl: string | null;
  webcalUrl: string | null;
};

export function CalendarSettingsCard() {
  const [settings, setSettings] = useState<CalendarSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"https" | "webcal" | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api<CalendarSettings>("/api/calendar/settings");
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载日历设置失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const data = await api<CalendarSettings>("/api/calendar/settings", {
        method: "PATCH",
        json: body,
      });
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function copyText(text: string, kind: "https" | "webcal") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("复制失败，请手动选中链接");
    }
  }

  function toggleWorkspace(id: string) {
    if (!settings) return;
    const set = new Set(settings.workspaceIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    void patch({ workspaceIds: [...set] });
  }

  return (
    <Card className="mb-6 p-5">
      <h2 className="mb-1 text-base font-semibold">日历同步</h2>
      <p className="mb-4 text-sm text-muted">
        将有<strong>截止日期</strong>
        的待办同步到手机系统日历（iOS / Android /
        桌面）。订阅后系统会周期性拉取更新，非实时。
      </p>

      <ErrorBanner message={error} />

      {loading || !settings ? (
        <p className="text-sm text-muted">{loading ? "加载中…" : "暂无数据"}</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              状态：{" "}
              <strong className={settings.enabled ? "text-teal-800" : ""}>
                {settings.enabled ? "已启用订阅" : "未启用"}
              </strong>
            </div>
            {settings.enabled ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="text-sm"
                  disabled={busy}
                  onClick={() => void patch({ regenerate: true })}
                >
                  重新生成链接
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-sm"
                  disabled={busy}
                  onClick={() => void patch({ disable: true })}
                >
                  停用
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                className="text-sm"
                disabled={busy}
                onClick={() => void patch({ enable: true })}
              >
                启用日历订阅
              </Button>
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-stone-50/80 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              导出范围
            </div>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-stone-300"
                checked={settings.includePersonal}
                disabled={busy}
                onChange={(e) =>
                  void patch({ includePersonal: e.target.checked })
                }
              />
              私人待办
            </label>
            {settings.workspaces.length === 0 ? (
              <p className="text-xs text-muted">暂无工作区可勾选</p>
            ) : (
              settings.workspaces.map((ws) => (
                <label
                  key={ws.id}
                  className="flex items-center gap-3 text-sm"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-stone-300"
                    checked={settings.workspaceIds.includes(ws.id)}
                    disabled={busy}
                    onChange={() => toggleWorkspace(ws.id)}
                  />
                  工作区 · {ws.name}
                </label>
              ))
            )}
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-stone-300"
                checked={settings.includeCompleted}
                disabled={busy}
                onChange={(e) =>
                  void patch({ includeCompleted: e.target.checked })
                }
              />
              包含已完成的待办
            </label>
          </div>

          {settings.enabled && settings.httpsUrl ? (
            <div className="space-y-3">
              <div>
                <div className="label">订阅链接（HTTPS）</div>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                  <input
                    readOnly
                    className="input font-mono text-xs"
                    value={settings.httpsUrl}
                    onFocus={(e) => e.target.select()}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0 text-sm"
                    onClick={() =>
                      void copyText(settings.httpsUrl!, "https")
                    }
                  >
                    {copied === "https" ? "已复制" : "复制"}
                  </Button>
                </div>
              </div>
              {settings.webcalUrl ? (
                <div>
                  <div className="label">webcal 链接（部分客户端）</div>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                    <input
                      readOnly
                      className="input font-mono text-xs"
                      value={settings.webcalUrl}
                      onFocus={(e) => e.target.select()}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="shrink-0 text-sm"
                      onClick={() =>
                        void copyText(settings.webcalUrl!, "webcal")
                      }
                    >
                      {copied === "webcal" ? "已复制" : "复制"}
                    </Button>
                  </div>
                </div>
              ) : null}
              <ol className="list-decimal space-y-1 pl-5 text-xs text-muted">
                <li>复制上方订阅链接</li>
                <li>
                  iOS：打开「日历」→ 底部「日历」→「添加订阅日历」→ 粘贴链接
                </li>
                <li>
                  Android / Google：日历设置 → 添加日历 → 通过 URL
                </li>
              </ol>
              <p className="text-xs text-amber-800">
                链接含私密令牌，请勿公开分享。泄露后请点「重新生成链接」。
              </p>
            </div>
          ) : null}

          <p className="text-xs text-muted">
            单条待办也可在清单中点「加入日历」，一次写入系统日历（不会随编辑自动更新）。
          </p>
        </div>
      )}
    </Card>
  );
}
