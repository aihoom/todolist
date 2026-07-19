"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { formatDueLabel } from "@/lib/dates";
import type { TodoItem } from "@/lib/types";
import { ErrorBanner } from "./ui";

export type WidgetTodoItem = TodoItem & {
  source: "personal" | "workspace";
  workspaceName?: string;
};

type Filter = "all" | "personal" | string;

function duePriority(iso: string | null): number {
  if (!iso) return 2;
  const t = new Date(iso).getTime() - Date.now();
  if (t < 0) return 0; // overdue
  if (t < 24 * 60 * 60 * 1000) return 1; // today-ish
  return 2;
}

export function WidgetClient({
  initialItems,
  siteName,
}: {
  initialItems: WidgetTodoItem[];
  siteName: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const workspaces = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of items) {
      if (t.workspaceId && t.workspaceName) {
        map.set(t.workspaceId, t.workspaceName);
      }
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (filter === "personal") {
      list = list.filter((t) => t.source === "personal");
    } else if (filter !== "all") {
      list = list.filter((t) => t.workspaceId === filter);
    }
    return [...list].sort((a, b) => {
      const pa = duePriority(a.dueAt);
      const pb = duePriority(b.dueAt);
      if (pa !== pb) return pa - pb;
      if (a.dueAt && b.dueAt) {
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      }
      if (a.dueAt && !b.dueAt) return -1;
      if (!a.dueAt && b.dueAt) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [items, filter]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const data = await api<{ items: WidgetTodoItem[] }>("/api/widget/todos");
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "刷新失败");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [refresh]);

  async function toggle(todo: WidgetTodoItem) {
    setBusyId(todo.id);
    setError(null);
    try {
      await api(`/api/todos/${todo.id}`, {
        method: "PATCH",
        json: { completed: true },
      });
      setItems((prev) => prev.filter((t) => t.id !== todo.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pb-8 pt-4"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-teal-800">
            {siteName}
          </div>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-stone-900">
            待办
          </h1>
          <p className="mt-1 text-sm text-muted">
            进行中 <strong className="text-stone-800">{filtered.length}</strong>{" "}
            条
            {refreshing ? (
              <span className="ml-2 text-xs text-muted">刷新中…</span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-stone-700 shadow-sm active:bg-stone-100"
        >
          刷新
        </button>
      </header>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["all", "全部"],
            ["personal", "私人"],
            ...workspaces.map((w) => [w.id, w.name] as const),
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filter === key
                ? "bg-primary text-white shadow-sm"
                : "bg-card text-muted ring-1 ring-border"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ErrorBanner message={error} />

      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
          <div className="text-3xl">✓</div>
          <p className="mt-3 text-base font-semibold text-stone-800">
            暂无进行中的待办
          </p>
          <p className="mt-1 text-sm text-muted">去工作区或私人清单添加一条吧</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((todo) => {
            const due = formatDueLabel(todo.dueAt);
            return (
              <li key={todo.id}>
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <button
                    type="button"
                    disabled={busyId === todo.id}
                    onClick={() => void toggle(todo)}
                    aria-label={`完成 ${todo.title}`}
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-stone-300 transition active:border-primary active:bg-teal-50 disabled:opacity-50"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-semibold leading-snug text-stone-900">
                      {todo.title}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="inline-flex rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-600">
                        {todo.source === "personal"
                          ? "私人"
                          : todo.workspaceName ?? "工作区"}
                      </span>
                      {todo.group ? (
                        <span className="inline-flex rounded-md bg-teal-50 px-1.5 py-0.5 text-[11px] font-medium text-teal-800">
                          {todo.group.name}
                        </span>
                      ) : null}
                      {due ? (
                        <span
                          className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                            due.tone === "danger"
                              ? "bg-red-50 text-red-700"
                              : due.tone === "warn"
                                ? "bg-amber-50 text-amber-800"
                                : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {due.text}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-muted">
        <Link href="/dashboard" className="font-medium text-primary hover:underline">
          工作区
        </Link>
        <Link href="/personal" className="font-medium text-primary hover:underline">
          私人待办
        </Link>
        <Link href="/profile" className="font-medium text-primary hover:underline">
          设置
        </Link>
      </footer>
    </div>
  );
}
