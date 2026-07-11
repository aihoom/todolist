"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { Button, Card, ErrorBanner } from "./ui";

type DomainRow = {
  id: string;
  domain: string;
  status: string;
  verifyToken: string;
  lastError: string | null;
  createdAt: string;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  user: { id: string; email: string; name: string };
};

export function AdminDomainsClient({
  initialDomains,
}: {
  initialDomains: DomainRow[];
}) {
  const [domains, setDomains] = useState(initialDomains);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(
    id: string,
    action: "force_active" | "force_pending" | "reverify" | "delete"
  ) {
    setBusy(id);
    setError(null);
    try {
      if (action === "delete") {
        if (!confirm("确定强制解绑该域名？")) {
          setBusy(null);
          return;
        }
        await api(`/api/admin/domains/${id}`, {
          method: "PATCH",
          json: { action },
        });
        setDomains((prev) => prev.filter((d) => d.id !== id));
      } else {
        const res = await api<{ domain: DomainRow }>(
          `/api/admin/domains/${id}`,
          { method: "PATCH", json: { action } }
        );
        setDomains((prev) =>
          prev.map((d) => (d.id === id ? { ...d, ...res.domain } : d))
        );
      }
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
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-border bg-stone-50 text-xs text-muted">
            <tr>
              <th className="px-4 py-3">域名</th>
              <th className="px-4 py-3">用户</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">错误</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {domains.map((d) => (
              <tr key={d.id} className="border-b border-border/70">
                <td className="px-4 py-3 font-mono text-xs font-semibold">
                  {d.domain}
                </td>
                <td className="px-4 py-3">
                  <div>{d.user.name}</div>
                  <div className="text-xs text-muted">{d.user.email}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={d.status} />
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-xs text-muted">
                  {d.lastError || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="!px-2 !py-1 text-xs"
                      disabled={busy === d.id}
                      onClick={() => void act(d.id, "reverify")}
                    >
                      重验
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="!px-2 !py-1 text-xs"
                      disabled={busy === d.id}
                      onClick={() => void act(d.id, "force_active")}
                    >
                      强制生效
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="!px-2 !py-1 text-xs"
                      disabled={busy === d.id}
                      onClick={() => void act(d.id, "delete")}
                    >
                      解绑
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {domains.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  暂无域名绑定
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-800",
    pending: "bg-amber-50 text-amber-800",
    failed: "bg-red-50 text-red-700",
  };
  const label: Record<string, string> = {
    active: "已生效",
    pending: "待验证",
    failed: "失败",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        map[status] || "bg-stone-100"
      }`}
    >
      {label[status] || status}
    </span>
  );
}
