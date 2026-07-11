"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { formatDueLabel, toDatetimeLocalValue } from "@/lib/dates";
import type { TodoGroupItem, TodoItem } from "@/lib/types";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
} from "./ui";
import { GroupManager, type GroupFilter } from "./group-manager";
import { MarkdownContent } from "./markdown-content";
import { MarkdownNoteField } from "./markdown-note-field";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortTodoList(list: TodoItem[]) {
  return [...list].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.dueAt && b.dueAt) {
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    }
    if (a.dueAt && !b.dueAt) return -1;
    if (!a.dueAt && b.dueAt) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function PersonalClient({
  initialTodos,
  initialGroups,
}: {
  initialTodos: TodoItem[];
  initialGroups: TodoGroupItem[];
}) {
  const [todos, setTodos] = useState(initialTodos);
  const [groups, setGroups] = useState(initialGroups);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "done">(
    "all"
  );
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDue, setEditDue] = useState("");

  const counts = useMemo(() => {
    const open = todos.filter((t) => !t.completed);
    const c: Record<string, number> = {
      all: open.length,
      ungrouped: open.filter((t) => !t.groupId).length,
    };
    for (const g of groups) {
      c[g.id] = open.filter((t) => t.groupId === g.id).length;
    }
    return c;
  }, [todos, groups]);

  const filtered = useMemo(() => {
    let list = todos;
    if (groupFilter === "ungrouped") list = list.filter((t) => !t.groupId);
    else if (groupFilter !== "all")
      list = list.filter((t) => t.groupId === groupFilter);
    // 「全部」只显示未完成，已完成仅在「已完成」里出现
    if (statusFilter === "all" || statusFilter === "open") {
      list = list.filter((t) => !t.completed);
    } else if (statusFilter === "done") {
      list = list.filter((t) => t.completed);
    }
    return list;
  }, [todos, groupFilter, statusFilter]);

  const openCount = todos.filter((t) => !t.completed).length;

  async function addTodo(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      const data = await api<{ todo: TodoItem }>("/api/personal/todos", {
        method: "POST",
        json: {
          title,
          description,
          dueAt: dueAt || null,
          groupId: groupId || null,
        },
      });
      setTodos((prev) => sortTodoList([data.todo, ...prev]));
      setTitle("");
      setDescription("");
      setDueAt("");
      // keep selected group for consecutive adds
    } catch (err) {
      setError(err instanceof Error ? err.message : "添加失败");
    } finally {
      setAdding(false);
    }
  }

  async function toggleTodo(todo: TodoItem) {
    setBusyId(todo.id);
    try {
      const data = await api<{ todo: TodoItem }>(`/api/todos/${todo.id}`, {
        method: "PATCH",
        json: { completed: !todo.completed },
      });
      setTodos((prev) =>
        sortTodoList(prev.map((t) => (t.id === todo.id ? data.todo : t)))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteTodo(todo: TodoItem) {
    if (!confirm(`确定删除「${todo.title}」吗？`)) return;
    setBusyId(todo.id);
    try {
      await api(`/api/todos/${todo.id}`, { method: "DELETE" });
      setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusyId(null);
    }
  }

  async function saveDue(todo: TodoItem) {
    setBusyId(todo.id);
    try {
      const data = await api<{ todo: TodoItem }>(`/api/todos/${todo.id}`, {
        method: "PATCH",
        json: { dueAt: editDue || null },
      });
      setTodos((prev) =>
        sortTodoList(prev.map((t) => (t.id === todo.id ? data.todo : t)))
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setBusyId(null);
    }
  }

  async function moveToGroup(todo: TodoItem, nextGroupId: string) {
    setBusyId(todo.id);
    try {
      const data = await api<{ todo: TodoItem }>(`/api/todos/${todo.id}`, {
        method: "PATCH",
        json: { groupId: nextGroupId || null },
      });
      setTodos((prev) =>
        sortTodoList(prev.map((t) => (t.id === todo.id ? data.todo : t)))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "移动失败");
    } finally {
      setBusyId(null);
    }
  }

  // default form group follows filter
  const formGroupValue =
    groupId ||
    (groupFilter !== "all" && groupFilter !== "ungrouped" ? groupFilter : "");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-muted hover:text-primary"
        >
          ← 返回工作区
        </Link>
      </div>

      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">
          仅自己可见
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          私人待办
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">
          用分组整理临时项目；加入工作区时可再选择同步。
        </p>
        <p className="mt-2 text-sm text-muted">
          进行中 <strong className="text-stone-800">{openCount}</strong> · 共{" "}
          <strong className="text-stone-800">{todos.length}</strong> 条
        </p>
      </div>

      <GroupManager
        groups={groups}
        filter={groupFilter}
        onFilterChange={(f) => {
          setGroupFilter(f);
          if (f !== "all" && f !== "ungrouped") setGroupId(f);
          else if (f === "ungrouped") setGroupId("");
        }}
        createUrl="/api/personal/groups"
        onGroupsChange={setGroups}
        counts={counts}
        onGroupDeleted={(id) => {
          setTodos((prev) =>
            prev.map((t) =>
              t.groupId === id ? { ...t, groupId: null, group: null } : t
            )
          );
        }}
        onGroupRenamed={(g) => {
          setTodos((prev) =>
            prev.map((t) =>
              t.groupId === g.id ? { ...t, group: { id: g.id, name: g.name } } : t
            )
          );
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold">我的清单</h2>
            <div className="flex rounded-xl border border-border bg-card p-0.5 text-sm">
              {(
                [
                  ["all", "进行中"],
                  ["done", "已完成"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`rounded-lg px-3 py-1.5 font-medium transition ${
                    statusFilter === key
                      ? "bg-primary text-white"
                      : "text-muted hover:text-stone-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <ErrorBanner message={error} />

          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                title={
                  statusFilter === "done"
                    ? "还没有已完成的事项"
                    : "这里还没有进行中的待办"
                }
                description={
                  statusFilter === "done"
                    ? "完成一些事项后会出现在这里。"
                    : "在右侧添加一条，或切换分组查看。"
                }
              />
            </Card>
          ) : (
            <ul className="space-y-2">
              {filtered.map((todo) => {
                const due = formatDueLabel(todo.dueAt);
                return (
                  <li key={todo.id}>
                    <Card
                      className={`p-4 ${todo.completed ? "opacity-75" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          disabled={busyId === todo.id}
                          onClick={() => toggleTodo(todo)}
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${
                            todo.completed
                              ? "border-success bg-success text-white"
                              : "border-stone-300 hover:border-primary"
                          }`}
                        >
                          {todo.completed ? "✓" : null}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`font-medium ${
                              todo.completed
                                ? "text-muted line-through"
                                : "text-stone-900"
                            }`}
                          >
                            {todo.title}
                          </div>
                          {todo.group ? (
                            <span className="mt-1 inline-flex rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-800">
                              {todo.group.name}
                            </span>
                          ) : null}
                          {todo.description ? (
                            <MarkdownContent
                              source={todo.description}
                              className="mt-2 text-sm text-muted"
                            />
                          ) : null}
                          {due ? (
                            <div
                              className={`mt-2 inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${
                                due.tone === "danger"
                                  ? "bg-red-50 text-red-700"
                                  : due.tone === "warn"
                                    ? "bg-amber-50 text-amber-800"
                                    : "bg-stone-100 text-stone-600"
                              }`}
                            >
                              ⏰ {due.text}
                            </div>
                          ) : null}
                          {editingId === todo.id ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Input
                                type="datetime-local"
                                value={editDue}
                                onChange={(e) => setEditDue(e.target.value)}
                                className="!w-auto text-sm"
                              />
                              <Button
                                type="button"
                                className="!px-2 !py-1 text-xs"
                                onClick={() => saveDue(todo)}
                              >
                                保存
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="!px-2 !py-1 text-xs"
                                onClick={() => setEditingId(null)}
                              >
                                取消
                              </Button>
                            </div>
                          ) : null}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                            <span>{formatTime(todo.createdAt)}</span>
                            <select
                              className="rounded-md border border-border bg-white px-1.5 py-0.5 text-xs"
                              value={todo.groupId ?? ""}
                              disabled={busyId === todo.id}
                              onChange={(e) =>
                                void moveToGroup(todo, e.target.value)
                              }
                            >
                              <option value="">未归类</option>
                              {groups.map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            className="!px-2 !py-1 text-xs"
                            onClick={() => {
                              setEditingId(todo.id);
                              setEditDue(toDatetimeLocalValue(todo.dueAt));
                            }}
                          >
                            截止
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="!px-2 !py-1 text-xs"
                            disabled={busyId === todo.id}
                            onClick={() => deleteTodo(todo)}
                          >
                            删除
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <Card className="sticky top-4 p-5">
            <h2 className="mb-1 text-base font-semibold">添加私人待办</h2>
            <p className="mb-4 text-sm text-muted">仅你可见</p>
            <form onSubmit={addTodo}>
              <Field label="标题">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：整理行程草稿"
                  required
                />
              </Field>
              <Field label="分组（可选）">
                <select
                  className="input"
                  value={formGroupValue}
                  onChange={(e) => setGroupId(e.target.value)}
                >
                  <option value="">未归类</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="截止日期（可选）">
                <Input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </Field>
              <Field
                label="备注（可选）"
                hint="支持 Markdown；可上传截图插入正文"
              >
                <MarkdownNoteField
                  value={description}
                  onChange={setDescription}
                  placeholder={
                    "补充说明、清单、截图…\n\n- [ ] 示例\n\n点工具栏「插入图片」可贴截图"
                  }
                  rows={6}
                  disabled={adding}
                />
              </Field>
              <Button type="submit" className="w-full" disabled={adding}>
                {adding ? "添加中…" : "添加到私人清单"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
