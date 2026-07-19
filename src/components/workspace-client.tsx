"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { formatDueLabel, toDatetimeLocalValue } from "@/lib/dates";
import type { TodoGroupItem, TodoItem, WorkspaceSummary } from "@/lib/types";
import {
  Avatar,
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
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", {
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

export function WorkspaceClient({
  initialWorkspace,
  currentUserId,
  platformBaseUrl = "",
}: {
  initialWorkspace: WorkspaceSummary;
  currentUserId: string;
  /** 主站根地址，用于展示 /w/{slug} 短链 */
  platformBaseUrl?: string;
}) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [groups, setGroups] = useState<TodoGroupItem[]>(
    initialWorkspace.groups ?? []
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [slugDraft, setSlugDraft] = useState(initialWorkspace.slug || "");
  const [slugBusy, setSlugBusy] = useState(false);
  const [slugMsg, setSlugMsg] = useState<string | null>(null);
  const [slugHint, setSlugHint] = useState<string | null>(null);
  const isOwner = workspace.ownerId === currentUserId;
  const base =
    platformBaseUrl.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "open" | "done" | "due"
  >("all");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
  const [live, setLive] = useState<"connecting" | "live" | "offline">(
    "connecting"
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDue, setEditDue] = useState("");

  useEffect(() => {
    let es: EventSource | null = null;
    let closed = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      setLive("connecting");
      es = new EventSource(`/api/workspaces/${workspace.id}/events`);

      es.onopen = () => setLive("live");

      es.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data) as {
            type: string;
            todo?: TodoItem;
            todoId?: string;
            group?: TodoGroupItem;
            groupId?: string;
          };
          if (event.type === "ping") return;

          if (
            event.type === "group.created" ||
            event.type === "group.updated" ||
            event.type === "group.deleted"
          ) {
            setGroups((prev) => {
              if (event.type === "group.created" && event.group) {
                if (prev.some((g) => g.id === event.group!.id)) return prev;
                return [...prev, event.group];
              }
              if (event.type === "group.updated" && event.group) {
                return prev.map((g) =>
                  g.id === event.group!.id ? event.group! : g
                );
              }
              if (event.type === "group.deleted" && event.groupId) {
                return prev.filter((g) => g.id !== event.groupId);
              }
              return prev;
            });
            if (event.type === "group.deleted" && event.groupId) {
              setWorkspace((prev) => ({
                ...prev,
                todos: (prev.todos ?? []).map((t) =>
                  t.groupId === event.groupId
                    ? { ...t, groupId: null, group: null }
                    : t
                ),
              }));
              setGroupFilter((f) =>
                f === event.groupId ? "all" : f
              );
            }
            if (event.type === "group.updated" && event.group) {
              const g = event.group;
              setWorkspace((prev) => ({
                ...prev,
                todos: (prev.todos ?? []).map((t) =>
                  t.groupId === g.id
                    ? { ...t, group: { id: g.id, name: g.name } }
                    : t
                ),
              }));
            }
            return;
          }

          setWorkspace((prev) => {
            const todos = prev.todos ?? [];
            if (event.type === "todo.created" && event.todo) {
              if (todos.some((t) => t.id === event.todo!.id)) return prev;
              return {
                ...prev,
                todos: sortTodoList([event.todo, ...todos]),
              };
            }
            if (event.type === "todo.updated" && event.todo) {
              return {
                ...prev,
                todos: sortTodoList(
                  todos.map((t) =>
                    t.id === event.todo!.id ? event.todo! : t
                  )
                ),
              };
            }
            if (event.type === "todo.deleted" && event.todoId) {
              return {
                ...prev,
                todos: todos.filter((t) => t.id !== event.todoId),
              };
            }
            return prev;
          });
        } catch {
          /* ignore */
        }
      };

      es.onerror = () => {
        setLive("offline");
        es?.close();
        retryTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
    };
  }, [workspace.id]);

  const allTodos = workspace.todos ?? [];

  const counts = useMemo(() => {
    // 分组角标只统计未完成，避免已完成撑大数字
    const open = allTodos.filter((t) => !t.completed);
    const c: Record<string, number> = {
      all: open.length,
      ungrouped: open.filter((t) => !t.groupId).length,
    };
    for (const g of groups) {
      c[g.id] = open.filter((t) => t.groupId === g.id).length;
    }
    return c;
  }, [allTodos, groups]);

  const todos = useMemo(() => {
    let list = allTodos;
    if (groupFilter === "ungrouped") list = list.filter((t) => !t.groupId);
    else if (groupFilter !== "all")
      list = list.filter((t) => t.groupId === groupFilter);

    // 「全部」只显示未完成，已完成仅在「已完成」里出现
    if (statusFilter === "all" || statusFilter === "open") {
      return list.filter((t) => !t.completed);
    }
    if (statusFilter === "done") return list.filter((t) => t.completed);
    if (statusFilter === "due") {
      return list.filter((t) => !t.completed && t.dueAt);
    }
    return list.filter((t) => !t.completed);
  }, [allTodos, groupFilter, statusFilter]);

  const openCount = allTodos.filter((t) => !t.completed).length;
  const doneCount = allTodos.filter((t) => t.completed).length;
  const dueCount = allTodos.filter((t) => !t.completed && t.dueAt).length;

  async function addTodo(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      const data = await api<{ todo: TodoItem }>(
        `/api/workspaces/${workspace.id}/todos`,
        {
          method: "POST",
          json: {
            title,
            description,
            dueAt: dueAt || null,
            groupId: groupId || null,
          },
        }
      );
      setWorkspace((prev) => ({
        ...prev,
        todos: sortTodoList([
          data.todo,
          ...(prev.todos ?? []).filter((t) => t.id !== data.todo.id),
        ]),
      }));
      setTitle("");
      setDescription("");
      setDueAt("");
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
      setWorkspace((prev) => ({
        ...prev,
        todos: sortTodoList(
          (prev.todos ?? []).map((t) =>
            t.id === todo.id ? data.todo : t
          )
        ),
      }));
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
      setWorkspace((prev) => ({
        ...prev,
        todos: (prev.todos ?? []).filter((t) => t.id !== todo.id),
      }));
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
      setWorkspace((prev) => ({
        ...prev,
        todos: sortTodoList(
          (prev.todos ?? []).map((t) =>
            t.id === todo.id ? data.todo : t
          )
        ),
      }));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新截止日期失败");
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
      setWorkspace((prev) => ({
        ...prev,
        todos: sortTodoList(
          (prev.todos ?? []).map((t) =>
            t.id === todo.id ? data.todo : t
          )
        ),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "移动失败");
    } finally {
      setBusyId(null);
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(workspace.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("复制失败，请手动复制邀请码");
    }
  }

  async function checkSlugAvailability(value: string) {
    const q = value.trim().toLowerCase();
    if (q.length < 2) {
      setSlugHint(null);
      return;
    }
    try {
      const res = await api<{
        available: boolean;
        reason: string | null;
        slug: string;
      }>(
        `/api/workspaces/slug-check?slug=${encodeURIComponent(q)}&excludeId=${workspace.id}`
      );
      if (res.available) {
        setSlugHint(`可用：/w/${res.slug}`);
      } else {
        setSlugHint(res.reason || "不可用");
      }
    } catch {
      setSlugHint(null);
    }
  }

  async function saveSlug() {
    setSlugBusy(true);
    setSlugMsg(null);
    setError(null);
    try {
      // 保存前再检一次
      const pre = await api<{ available: boolean; reason: string | null }>(
        `/api/workspaces/slug-check?slug=${encodeURIComponent(slugDraft)}&excludeId=${workspace.id}`
      );
      if (!pre.available) {
        setError(pre.reason || "该后缀不可用");
        setSlugBusy(false);
        return;
      }

      const data = await api<{ workspace: { slug: string } }>(
        `/api/workspaces/${workspace.id}/settings`,
        {
          method: "PATCH",
          json: { slug: slugDraft },
        }
      );
      setWorkspace((prev) => ({ ...prev, slug: data.workspace.slug }));
      setSlugDraft(data.workspace.slug);
      setSlugMsg("路径后缀已保存（全站唯一）");
      setSlugHint(`主站访问：${base}/w/${data.workspace.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存后缀失败");
    } finally {
      setSlugBusy(false);
    }
  }

  const liveLabel =
    live === "live"
      ? "实时同步中"
      : live === "connecting"
        ? "连接中…"
        : "离线重连中";

  const formGroupValue =
    groupId ||
    (groupFilter !== "all" && groupFilter !== "ungrouped" ? groupFilter : "");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-muted hover:text-primary"
        >
          ← 返回工作区列表
        </Link>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            live === "live"
              ? "bg-emerald-50 text-emerald-800"
              : live === "connecting"
                ? "bg-amber-50 text-amber-800"
                : "bg-stone-100 text-stone-600"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              live === "live"
                ? "bg-emerald-500"
                : live === "connecting"
                  ? "bg-amber-500"
                  : "bg-stone-400"
            }`}
          />
          {liveLabel}
        </span>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            {workspace.name}
          </h1>
          {workspace.description ? (
            <p className="mt-2 max-w-xl text-sm text-muted">
              {workspace.description}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>
              进行中 <strong className="text-stone-800">{openCount}</strong>
            </span>
            <span className="text-border">·</span>
            <span>
              有截止 <strong className="text-stone-800">{dueCount}</strong>
            </span>
            <span className="text-border">·</span>
            <span>
              已完成 <strong className="text-stone-800">{doneCount}</strong>
            </span>
            <span className="text-border">·</span>
            <span>
              分组 <strong className="text-stone-800">{groups.length}</strong>
            </span>
          </div>
        </div>

        <div className="flex min-w-[240px] flex-col gap-3">
          <Card className="p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              邀请码
            </div>
            <div className="flex items-center gap-2">
              <code className="rounded-lg bg-stone-100 px-3 py-1.5 font-mono text-lg font-bold tracking-[0.2em] text-stone-800">
                {workspace.inviteCode}
              </code>
              <Button
                type="button"
                variant="secondary"
                className="!px-3 !py-1.5 text-sm"
                onClick={copyInvite}
              >
                {copied ? "已复制" : "复制"}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted">
              把邀请码发给对方，即可加入此工作区
            </p>
          </Card>

          {isOwner ? (
            <Card className="p-4">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                路径后缀（全站唯一）
              </div>
              <p className="mb-2 text-xs text-muted">
                无自定义域名时用主站短链；有域名时也可用「域名/后缀」。
              </p>
              <div className="mb-2 rounded-lg bg-stone-100 px-2 py-1.5 font-mono text-xs text-stone-700 break-all">
                {base}/w/{workspace.slug || "…"}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted">/w/</span>
                <Input
                  value={slugDraft}
                  onChange={(e) => {
                    const v = e.target.value.toLowerCase();
                    setSlugDraft(v);
                    setSlugMsg(null);
                    void checkSlugAvailability(v);
                  }}
                  className="!w-36 font-mono text-sm"
                  placeholder="aihoom"
                  maxLength={40}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-3 !py-1.5 text-sm"
                  disabled={slugBusy}
                  onClick={() => void saveSlug()}
                >
                  {slugBusy ? "…" : "保存"}
                </Button>
              </div>
              {slugHint ? (
                <p
                  className={`mt-2 text-xs ${
                    slugHint.includes("占用") || slugHint.includes("不可")
                      ? "text-danger"
                      : "text-muted"
                  }`}
                >
                  {slugHint}
                </p>
              ) : null}
              {slugMsg ? (
                <p className="mt-1 text-xs text-success">{slugMsg}</p>
              ) : null}
              <p className="mt-2 text-[11px] text-muted">
                自定义域名请在个人资料中绑定；后缀保存前会检测是否重复。
              </p>
            </Card>
          ) : workspace.slug ? (
            <Card className="p-4">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                短链
              </div>
              <code className="break-all font-mono text-xs">
                {base}/w/{workspace.slug}
              </code>
            </Card>
          ) : null}
        </div>
      </div>

      <div className="mb-5">
        <div className="mb-2 text-sm font-semibold text-stone-700">成员</div>
        <div className="flex flex-wrap gap-2">
          {workspace.members.map((m) => (
            <div
              key={m.id}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1.5 text-sm"
            >
              <Avatar
                name={m.user.name}
                avatarUrl={m.user.avatarUrl}
                size={22}
              />
              <span className="font-medium">
                {m.user.name}
                {m.user.id === currentUserId ? "（我）" : ""}
              </span>
              {m.role === "owner" ? (
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                  创建者
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <GroupManager
        groups={groups}
        filter={groupFilter}
        onFilterChange={(f) => {
          setGroupFilter(f);
          if (f !== "all" && f !== "ungrouped") setGroupId(f);
          else if (f === "ungrouped") setGroupId("");
        }}
        createUrl={`/api/workspaces/${workspace.id}/groups`}
        onGroupsChange={setGroups}
        counts={counts}
        onGroupDeleted={(id) => {
          setWorkspace((prev) => ({
            ...prev,
            todos: (prev.todos ?? []).map((t) =>
              t.groupId === id ? { ...t, groupId: null, group: null } : t
            ),
          }));
        }}
        onGroupRenamed={(g) => {
          setWorkspace((prev) => ({
            ...prev,
            todos: (prev.todos ?? []).map((t) =>
              t.groupId === g.id
                ? { ...t, group: { id: g.id, name: g.name } }
                : t
            ),
          }));
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold">共享待办</h2>
            <div className="flex flex-wrap rounded-xl border border-border bg-card p-0.5 text-sm">
              {(
                [
                  ["all", "进行中"],
                  ["due", "有截止"],
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

          {todos.length === 0 ? (
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
                    : "新建分组整理临时项目，或在右侧添加一条计划。"
                }
              />
            </Card>
          ) : (
            <ul className="space-y-2">
              {todos.map((todo) => {
                const isMine = todo.createdById === currentUserId;
                const due = formatDueLabel(todo.dueAt);
                return (
                  <li key={todo.id}>
                    <Card
                      className={`p-4 transition ${
                        todo.completed ? "opacity-75" : ""
                      }`}
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
                            <span className="mt-1 inline-flex rounded-md bg-teal-50 px-1.5 py-0.5 text-[11px] font-medium text-teal-800">
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
                                disabled={busyId === todo.id}
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
                            <span className="inline-flex items-center gap-1.5">
                              <Avatar
                                name={todo.createdBy.name}
                                avatarUrl={todo.createdBy.avatarUrl}
                                size={16}
                              />
                              {isMine ? "我" : todo.createdBy.name} 添加
                            </span>
                            <span>·</span>
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
                            {todo.completed && todo.completedAt ? (
                              <>
                                <span>·</span>
                                <span className="text-success">
                                  完成于 {formatTime(todo.completedAt)}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            className="!px-2 !py-1 text-xs"
                            disabled={busyId === todo.id}
                            onClick={() => {
                              setEditingId(todo.id);
                              setEditDue(toDatetimeLocalValue(todo.dueAt));
                            }}
                          >
                            截止
                          </Button>
                          {todo.dueAt && !todo.completed ? (
                            <a
                              href={`/api/calendar/todos/${todo.id}`}
                              className="rounded-lg px-2 py-1 text-center text-xs font-medium text-muted transition hover:bg-stone-100 hover:text-stone-800"
                            >
                              加入日历
                            </a>
                          ) : null}
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
            <h2 className="mb-1 text-base font-semibold">添加待办</h2>
            <p className="mb-4 text-sm text-muted">
              可放入分组，临时项目不必新建工作区
            </p>
            <form onSubmit={addTodo}>
              <Field label="标题">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：今晚一起买菜"
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
                    "补充说明、地点、清单…\n\n- [ ] 示例待办项\n- **加粗** 与 `代码`\n\n点工具栏「插入图片」可贴截图"
                  }
                  rows={6}
                  disabled={adding}
                />
              </Field>
              <Button type="submit" className="w-full" disabled={adding}>
                {adding ? "添加中…" : "添加到工作区"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
