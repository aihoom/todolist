"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { TodoGroupItem } from "@/lib/types";
import { Button, Input } from "./ui";

export type GroupFilter = "all" | "ungrouped" | string; // string = group id

type Props = {
  groups: TodoGroupItem[];
  filter: GroupFilter;
  onFilterChange: (f: GroupFilter) => void;
  /** 创建分组 API 路径 */
  createUrl: string;
  onGroupsChange: (groups: TodoGroupItem[]) => void;
  /** 删除/重命名后，把受影响待办的 group 清掉或改名 */
  onGroupDeleted?: (groupId: string) => void;
  onGroupRenamed?: (group: TodoGroupItem) => void;
  counts?: Record<string, number>; // groupId | ungrouped | all
};

export function GroupManager({
  groups,
  filter,
  onFilterChange,
  createUrl,
  onGroupsChange,
  onGroupDeleted,
  onGroupRenamed,
  counts,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // 「未归类」筛选按钮隐藏时，回到全部分组
  useEffect(() => {
    if (
      filter === "ungrouped" &&
      (groups.length === 0 || (counts?.ungrouped ?? 0) === 0)
    ) {
      onFilterChange("all");
    }
  }, [filter, groups.length, counts?.ungrouped, onFilterChange]);

  async function createGroup(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const data = await api<{ group: TodoGroupItem }>(createUrl, {
        method: "POST",
        json: { name: newName.trim() },
      });
      onGroupsChange([...groups, data.group]);
      setNewName("");
      setAdding(false);
      onFilterChange(data.group.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function renameGroup(group: TodoGroupItem) {
    const name = editName.trim();
    if (!name || name === group.name) {
      setEditingId(null);
      return;
    }
    setBusyId(group.id);
    setError(null);
    try {
      const data = await api<{ group: TodoGroupItem }>(
        `/api/groups/${group.id}`,
        {
          method: "PATCH",
          json: { name },
        }
      );
      onGroupsChange(groups.map((g) => (g.id === group.id ? data.group : g)));
      onGroupRenamed?.(data.group);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重命名失败");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteGroup(group: TodoGroupItem) {
    if (
      !confirm(
        `确定删除分组「${group.name}」吗？\n组内待办不会删除，会变为未归类。`
      )
    ) {
      return;
    }
    setBusyId(group.id);
    setError(null);
    try {
      await api(`/api/groups/${group.id}`, { method: "DELETE" });
      onGroupsChange(groups.filter((g) => g.id !== group.id));
      onGroupDeleted?.(group.id);
      if (filter === group.id) onFilterChange("all");
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusyId(null);
    }
  }

  const chip = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
      active
        ? "border-primary bg-primary text-white"
        : "border-border bg-card text-stone-700 hover:border-teal-300"
    }`;

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={chip(filter === "all")}
          onClick={() => onFilterChange("all")}
        >
          全部分组
          {counts?.all !== undefined ? (
            <span className="opacity-80">{counts.all}</span>
          ) : null}
        </button>
        {/* 「未分组」仅在有真实分组且存在未归类待办时出现，避免被当成系统分组 */}
        {groups.length > 0 && (counts?.ungrouped ?? 0) > 0 ? (
          <button
            type="button"
            className={chip(filter === "ungrouped")}
            onClick={() => onFilterChange("ungrouped")}
            title="筛选没有归入任何分组的待办（不是系统分组）"
          >
            未归类
            <span className="opacity-80">{counts?.ungrouped}</span>
          </button>
        ) : null}

        {groups.map((g) =>
          editingId === g.id ? (
            <form
              key={g.id}
              className="inline-flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                void renameGroup(g);
              }}
            >
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="!h-8 !w-28 !rounded-full !px-3 !py-1 text-sm"
                autoFocus
                maxLength={40}
              />
              <Button
                type="submit"
                className="!rounded-full !px-2 !py-1 text-xs"
                disabled={busyId === g.id}
              >
                存
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="!rounded-full !px-2 !py-1 text-xs"
                onClick={() => setEditingId(null)}
              >
                取消
              </Button>
            </form>
          ) : (
            <div
              key={g.id}
              className={`group/chip inline-flex items-center gap-0.5 rounded-full border ${
                filter === g.id
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-card"
              }`}
            >
              <button
                type="button"
                className={`rounded-l-full px-3 py-1.5 text-sm font-medium ${
                  filter === g.id
                    ? "text-white"
                    : "text-stone-700 hover:text-primary"
                }`}
                onClick={() => onFilterChange(g.id)}
              >
                {g.name}
                {counts?.[g.id] !== undefined ? (
                  <span className="ml-1.5 opacity-80">{counts[g.id]}</span>
                ) : g._count ? (
                  <span className="ml-1.5 opacity-80">{g._count.todos}</span>
                ) : null}
              </button>
              <button
                type="button"
                title="重命名"
                disabled={busyId === g.id}
                className={`rounded px-1.5 py-1 text-xs opacity-70 hover:opacity-100 ${
                  filter === g.id ? "text-white" : "text-muted"
                }`}
                onClick={() => {
                  setEditingId(g.id);
                  setEditName(g.name);
                }}
              >
                ✎
              </button>
              <button
                type="button"
                title="删除分组"
                disabled={busyId === g.id}
                className={`mr-1 rounded px-1.5 py-1 text-xs opacity-70 hover:text-danger hover:opacity-100 ${
                  filter === g.id ? "text-white" : "text-muted"
                }`}
                onClick={() => void deleteGroup(g)}
              >
                ×
              </button>
            </div>
          )
        )}

        {!adding ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-stone-300 px-3 py-1.5 text-sm font-medium text-muted hover:border-primary hover:text-primary"
            onClick={() => setAdding(true)}
          >
            + 新建分组
          </button>
        ) : (
          <form
            onSubmit={createGroup}
            className="inline-flex flex-wrap items-center gap-1.5"
          >
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="分组名，如：周末旅行"
              className="!h-9 !w-40 !rounded-full !px-3 text-sm"
              autoFocus
              maxLength={40}
              required
            />
            <Button
              type="submit"
              className="!rounded-full !px-3 !py-1.5 text-sm"
              disabled={creating}
            >
              {creating ? "…" : "添加"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="!rounded-full !px-2 !py-1.5 text-sm"
              onClick={() => {
                setAdding(false);
                setNewName("");
              }}
            >
              取消
            </Button>
          </form>
        )}
      </div>
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : (
        <p className="text-xs text-muted">
          可新建、重命名、删除分组。删除后待办会回到未归类，不会丢数据。
        </p>
      )}
    </div>
  );
}
