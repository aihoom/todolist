"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { Button, Card, ErrorBanner } from "./ui";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: string;
  _count: {
    ownedWorkspaces: number;
    memberships: number;
    customDomains: number;
  };
};

export function AdminUsersClient({
  initialUsers,
  currentAdminId,
}: {
  initialUsers: UserRow[];
  currentAdminId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function patch(id: string, data: { status?: string; role?: string }) {
    setBusy(id);
    setError(null);
    try {
      const res = await api<{ user: UserRow }>(`/api/admin/users/${id}`, {
        method: "PATCH",
        json: data,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...res.user } : u))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <ErrorBanner message={error} />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-stone-50 text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">用户</th>
              <th className="px-4 py-3 font-semibold">角色</th>
              <th className="px-4 py-3 font-semibold">状态</th>
              <th className="px-4 py-3 font-semibold">工作区</th>
              <th className="px-4 py-3 font-semibold">域名</th>
              <th className="px-4 py-3 font-semibold">注册时间</th>
              <th className="px-4 py-3 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/70">
                <td className="px-4 py-3">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted">{u.email}</div>
                </td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      u.status === "active"
                        ? "text-success"
                        : "font-medium text-danger"
                    }
                  >
                    {u.status === "active" ? "正常" : "已禁用"}
                  </span>
                </td>
                <td className="px-4 py-3">{u._count.ownedWorkspaces}</td>
                <td className="px-4 py-3">{u._count.customDomains}</td>
                <td className="px-4 py-3 text-xs text-muted">
                  {new Date(u.createdAt).toLocaleString("zh-CN")}
                </td>
                <td className="px-4 py-3">
                  {u.id === currentAdminId ? (
                    <span className="text-xs text-muted">当前账号</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-2 !py-1 text-xs"
                        disabled={busy === u.id}
                        onClick={() =>
                          void patch(u.id, {
                            status:
                              u.status === "active" ? "disabled" : "active",
                          })
                        }
                      >
                        {u.status === "active" ? "禁用" : "解禁"}
                      </Button>
                      {u.role !== "admin" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="!px-2 !py-1 text-xs"
                          disabled={busy === u.id}
                          onClick={() => {
                            if (confirm("设为管理员？")) {
                              void patch(u.id, { role: "admin" });
                            }
                          }}
                        >
                          升为管理员
                        </Button>
                      ) : null}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
