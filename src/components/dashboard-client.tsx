"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import type { TodoItem, WorkspaceSummary } from "@/lib/types";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  SuccessBanner,
  Textarea,
} from "./ui";
import {
  SyncPersonalModal,
  type SyncModalPayload,
} from "./sync-personal-modal";

export function DashboardClient({
  initialWorkspaces,
  personalOpenCount = 0,
}: {
  initialWorkspaces: WorkspaceSummary[];
  personalOpenCount?: number;
}) {
  const router = useRouter();
  const [workspaces, setWorkspaces] =
    useState<WorkspaceSummary[]>(initialWorkspaces);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [syncModal, setSyncModal] = useState<SyncModalPayload | null>(null);

  async function createWorkspace(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const data = await api<{ workspace: WorkspaceSummary }>(
        "/api/workspaces",
        {
          method: "POST",
          json: { name, description },
        }
      );
      setWorkspaces((prev) => [data.workspace, ...prev]);
      setName("");
      setDescription("");

      // 创建工作区时，若有私人待办也询问是否同步
      if (personalOpenCount > 0) {
        try {
          const personal = await api<{ todos: TodoItem[] }>(
            "/api/personal/todos"
          );
          const open = personal.todos.filter((t) => !t.completed);
          if (open.length > 0) {
            setSyncModal({
              workspaceId: data.workspace.id,
              workspaceName: data.workspace.name,
              personalTodos: open,
            });
            return;
          }
        } catch {
          /* 忽略，直接进入工作区 */
        }
      }
      router.push(`/workspace/${data.workspace.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function joinWorkspace(e: FormEvent) {
    e.preventDefault();
    setJoinError(null);
    setSuccess(null);
    setJoining(true);
    try {
      const data = await api<{
        workspaceId: string;
        workspaceName: string;
        alreadyMember: boolean;
        personalOpenCount: number;
        personalTodos: TodoItem[];
      }>("/api/workspaces/join", {
        method: "POST",
        json: { inviteCode },
      });
      setInviteCode("");

      if (data.alreadyMember) {
        setSuccess("你已是该工作区成员，正在跳转…");
      }

      if (!data.alreadyMember && data.personalOpenCount > 0) {
        setSyncModal({
          workspaceId: data.workspaceId,
          workspaceName: data.workspaceName,
          personalTodos: data.personalTodos,
        });
        router.refresh();
        return;
      }

      router.push(`/workspace/${data.workspaceId}`);
      router.refresh();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "加入失败");
    } finally {
      setJoining(false);
    }
  }

  function goToWorkspace(workspaceId: string) {
    setSyncModal(null);
    router.push(`/workspace/${workspaceId}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            我的工作区
          </h1>
          <p className="mt-2 text-sm text-muted sm:text-base">
            工作区像你们共同的计划本——可以只和一个人共享，也可以邀请更多人一起用。
          </p>
        </div>
        <Link
          href="/personal"
          className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-900 transition hover:border-violet-300 hover:bg-violet-100"
        >
          <span>🔒</span>
          私人待办
          {personalOpenCount > 0 ? (
            <span className="rounded-full bg-violet-200 px-2 py-0.5 text-xs">
              {personalOpenCount}
            </span>
          ) : null}
        </Link>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-1 text-base font-semibold">创建工作区</h2>
          <p className="mb-4 text-sm text-muted">
            例如「我们俩」「家庭事务」「周末旅行」
          </p>
          <ErrorBanner message={error} />
          <form onSubmit={createWorkspace}>
            <Field label="名称">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="工作区名称"
                required
              />
            </Field>
            <Field label="描述（可选）">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简单说明这个工作区是做什么的"
                rows={2}
              />
            </Field>
            <Button type="submit" disabled={creating}>
              {creating ? "创建中…" : "创建"}
            </Button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 text-base font-semibold">加入工作区</h2>
          <p className="mb-4 text-sm text-muted">
            输入对方分享给你的 8 位邀请码
          </p>
          <ErrorBanner message={joinError} />
          <SuccessBanner message={success} />
          <form onSubmit={joinWorkspace}>
            <Field label="邀请码">
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="例如：A3K9M2PQ"
                required
                className="font-mono tracking-widest uppercase"
              />
            </Field>
            <Button type="submit" variant="secondary" disabled={joining}>
              {joining ? "加入中…" : "加入"}
            </Button>
          </form>
          {personalOpenCount > 0 ? (
            <p className="mt-3 text-xs text-muted">
              你有 {personalOpenCount}{" "}
              条未完成的私人待办。加入后可选择是否同步到工作区。
            </p>
          ) : null}
        </Card>
      </div>

      {workspaces.length === 0 ? (
        <Card>
          <EmptyState
            title="还没有工作区"
            description="创建一个新工作区，或用邀请码加入对方的工作区。也可以先在「私人待办」里记自己的计划。"
            action={
              <Link href="/personal" className="font-semibold text-primary">
                去写私人待办 →
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {workspaces.map((ws) => (
            <Link key={ws.id} href={`/workspace/${ws.id}`} className="group">
              <Card className="h-full p-5 transition group-hover:border-teal-300 group-hover:shadow-md">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900 group-hover:text-primary">
                      {ws.name}
                    </h3>
                    {ws.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted">
                        {ws.description}
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                    {ws._count?.todos ?? 0} 条待办
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {ws.members.slice(0, 5).map((m) => (
                      <div
                        key={m.id}
                        className="rounded-full ring-2 ring-card"
                      >
                        <Avatar
                          name={m.user.name}
                          avatarUrl={m.user.avatarUrl}
                          size={28}
                        />
                      </div>
                    ))}
                    {ws.members.length > 5 ? (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-200 text-[10px] font-semibold text-stone-600 ring-2 ring-card">
                        +{ws.members.length - 5}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted">
                    {ws.members.length} 位成员
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {syncModal ? (
        <SyncPersonalModal
          payload={syncModal}
          onClose={() => goToWorkspace(syncModal.workspaceId)}
          onSynced={(n) => {
            setSuccess(
              n > 0
                ? `已同步 ${n} 条私人待办到工作区`
                : "没有可同步的待办"
            );
            goToWorkspace(syncModal.workspaceId);
          }}
        />
      ) : null}
    </div>
  );
}
