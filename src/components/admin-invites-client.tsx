"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/client";
import { Button, Card, ErrorBanner, Field, Input, SuccessBanner } from "./ui";

type Invite = {
  id: string;
  code: string;
  note: string | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
};

export function AdminInvitesClient({
  initialInvites,
  appUrl,
}: {
  initialInvites: Invite[];
  appUrl: string;
}) {
  const [invites, setInvites] = useState(initialInvites);
  const [note, setNote] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [days, setDays] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api<{ invite: Invite }>("/api/admin/invites", {
        method: "POST",
        json: {
          note: note || undefined,
          maxUses: maxUses ? Number(maxUses) : null,
          expiresInDays: days ? Number(days) : null,
        },
      });
      setInvites((prev) => [res.invite, ...prev]);
      setNote("");
      setMaxUses("");
      setDays("");
      setSuccess("已生成邀请链接");
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, active: boolean) {
    try {
      const res = await api<{ invite: Invite }>(`/api/admin/invites/${id}`, {
        method: "PATCH",
        json: { active },
      });
      setInvites((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...res.invite } : i))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    }
  }

  function linkOf(code: string) {
    return `${appUrl.replace(/\/$/, "")}/register?invite=${code}`;
  }

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">生成邀请链接</h2>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-3">
          <Field label="备注">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：朋友圈"
            />
          </Field>
          <Field label="次数上限（空=不限）">
            <Input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </Field>
          <Field label="有效天数（空=永久）">
            <Input
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={busy}>
              {busy ? "生成中…" : "生成"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-stone-50 text-xs text-muted">
            <tr>
              <th className="px-4 py-3">链接</th>
              <th className="px-4 py-3">使用</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((i) => (
              <tr key={i.id} className="border-b border-border/70">
                <td className="px-4 py-3">
                  <div className="font-mono text-xs font-semibold">{i.code}</div>
                  <div className="mt-1 break-all text-xs text-muted">
                    {linkOf(i.code)}
                  </div>
                  {i.note ? (
                    <div className="mt-1 text-xs text-stone-600">{i.note}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {i.usedCount}
                  {i.maxUses != null ? ` / ${i.maxUses}` : " / ∞"}
                </td>
                <td className="px-4 py-3">
                  {i.active ? (
                    <span className="text-success">有效</span>
                  ) : (
                    <span className="text-muted">已关闭</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="!px-2 !py-1 text-xs"
                      onClick={() => {
                        void navigator.clipboard.writeText(linkOf(i.code));
                        setSuccess("已复制链接");
                      }}
                    >
                      复制
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="!px-2 !py-1 text-xs"
                      onClick={() => void toggle(i.id, !i.active)}
                    >
                      {i.active ? "关闭" : "启用"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
