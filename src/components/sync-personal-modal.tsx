"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/client";
import type { TodoItem } from "@/lib/types";
import { formatDueLabel } from "@/lib/dates";
import { Button, Card, ErrorBanner } from "./ui";

export type SyncModalPayload = {
  workspaceId: string;
  workspaceName: string;
  personalTodos: TodoItem[];
};

export function SyncPersonalModal({
  payload,
  onClose,
  onSynced,
}: {
  payload: SyncModalPayload;
  onClose: () => void;
  onSynced: (synced: number) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(payload.personalTodos.map((t) => t.id))
  );
  const [removeFromPersonal, setRemoveFromPersonal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = useMemo(
    () =>
      payload.personalTodos.length > 0 &&
      payload.personalTodos.every((t) => selected.has(t.id)),
    [payload.personalTodos, selected]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(payload.personalTodos.map((t) => t.id)));
  }

  async function sync() {
    if (selected.size === 0) {
      setError("请至少选择一条待办");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ synced: number }>(
        `/api/workspaces/${payload.workspaceId}/sync-personal`,
        {
          method: "POST",
          json: {
            todoIds: [...selected],
            onlyOpen: true,
            removeFromPersonal,
          },
        }
      );
      onSynced(data.synced);
    } catch (err) {
      setError(err instanceof Error ? err.message : "同步失败");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm">
      <Card className="max-h-[90vh] w-full max-w-lg overflow-hidden p-0 shadow-xl">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold text-stone-900">同步私人待办？</h2>
          <p className="mt-1 text-sm text-muted">
            你已加入工作区「
            <strong className="text-stone-800">{payload.workspaceName}</strong>
            」。是否把私人清单里的事项同步进去，方便和成员一起看？
          </p>
        </div>

        <div className="max-h-[40vh] overflow-y-auto px-5 py-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-stone-700">
              未完成的私人待办（{payload.personalTodos.length}）
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {allSelected ? "取消全选" : "全选"}
            </button>
          </div>

          <ul className="space-y-2">
            {payload.personalTodos.map((todo) => {
              const due = formatDueLabel(todo.dueAt);
              return (
                <li key={todo.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-stone-50/80 px-3 py-2.5 hover:border-teal-200">
                    <input
                      type="checkbox"
                      checked={selected.has(todo.id)}
                      onChange={() => toggle(todo.id)}
                      className="mt-1 h-4 w-4 rounded border-stone-300"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-stone-900">
                        {todo.title}
                      </div>
                      {due ? (
                        <div className="mt-0.5 text-xs text-muted">
                          ⏰ {due.text}
                        </div>
                      ) : null}
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-3 border-t border-border px-5 py-4">
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={removeFromPersonal}
              onChange={(e) => setRemoveFromPersonal(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300"
            />
            同步后从私人清单中移除（默认是复制一份，私人仍保留）
          </label>

          <ErrorBanner message={error} />

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={onClose}
            >
              暂不同步
            </Button>
            <Button
              type="button"
              disabled={busy || selected.size === 0}
              onClick={() => void sync()}
            >
              {busy ? "同步中…" : `同步 ${selected.size} 条到工作区`}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
