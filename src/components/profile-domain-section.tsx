"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/client";
import { Button, Card, ErrorBanner, Field, Input, SuccessBanner } from "./ui";

type DomainRow = {
  id: string;
  domain: string;
  status: string;
  verifyToken: string;
  lastError: string | null;
  createdAt: string;
};

type Ws = { id: string; name: string; slug: string };

/**
 * 个人资料内：自定义域名 + 默认落地工作区
 * （工作区路径后缀在对应工作区页编辑）
 */
export function ProfileDomainSection({
  initialDomains,
  workspaces,
  defaultWorkspaceId,
  platformCnameTarget,
}: {
  initialDomains: DomainRow[];
  workspaces: Ws[];
  defaultWorkspaceId: string | null;
  platformCnameTarget: string | null;
}) {
  const [domains, setDomains] = useState(initialDomains);
  const [domainInput, setDomainInput] = useState("");
  const [defaultWs, setDefaultWs] = useState(defaultWorkspaceId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addDomain(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api<{ domain: DomainRow }>("/api/account/domains", {
        method: "POST",
        json: { domain: domainInput },
      });
      setDomains((prev) => [res.domain, ...prev]);
      setDomainInput("");
      setSuccess(`已添加 ${res.domain.domain}。请配置 DNS 后点击「验证」。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "添加失败");
    } finally {
      setBusy(false);
    }
  }

  async function verify(id: string) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api<{ domain: DomainRow }>(
        `/api/account/domains/${id}/verify`,
        { method: "POST" }
      );
      setDomains((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...res.domain } : d))
      );
      setSuccess("域名验证成功，已生效！");
    } catch (err) {
      setError(err instanceof Error ? err.message : "验证失败");
      try {
        const list = await api<{ domains: DomainRow[] }>("/api/account/domains");
        setDomains(list.domains);
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false);
    }
  }

  async function removeDomain(id: string) {
    if (!confirm("确定解绑该域名？")) return;
    setBusy(true);
    try {
      await api(`/api/account/domains/${id}`, { method: "DELETE" });
      setDomains((prev) => prev.filter((d) => d.id !== id));
      setSuccess("已解绑");
    } catch (err) {
      setError(err instanceof Error ? err.message : "解绑失败");
    } finally {
      setBusy(false);
    }
  }

  async function saveDefault() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/account/default-workspace", {
        method: "PATCH",
        json: { workspaceId: defaultWs || null },
      });
      setSuccess("默认落地工作区已更新");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 space-y-4">
      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <Card className="p-5">
        <h2 className="mb-1 text-base font-semibold">自定义域名</h2>
        <p className="mb-4 text-sm text-muted">
          可选：没有自定义域名时，也可直接用主站短链{" "}
          <code className="rounded bg-stone-100 px-1 text-xs">
            主站/w/后缀
          </code>
          （后缀在各工作区页设置，全站唯一）。绑定域名后还可用{" "}
          <code className="rounded bg-stone-100 px-1 text-xs">
            你的域名/后缀
          </code>
          。开发环境可设 <code className="text-xs">DOMAIN_VERIFY_SKIP=1</code>{" "}
          跳过 DNS。
        </p>
        <form onSubmit={addDomain} className="mb-4 flex flex-wrap gap-2">
          <Input
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="plan.3o.pw"
            className="max-w-xs font-mono"
            required
          />
          <Button type="submit" disabled={busy}>
            添加域名
          </Button>
        </form>

        {domains.length === 0 ? (
          <p className="text-sm text-muted">尚未绑定域名</p>
        ) : (
          <ul className="space-y-3">
            {domains.map((d) => (
              <li
                key={d.id}
                className="rounded-xl border border-border bg-stone-50/80 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-mono font-semibold">{d.domain}</div>
                    <div className="text-xs text-muted">
                      状态：{d.status}
                      {d.lastError ? ` · ${d.lastError}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {d.status !== "active" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-2 !py-1 text-xs"
                        disabled={busy}
                        onClick={() => void verify(d.id)}
                      >
                        验证
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      className="!px-2 !py-1 text-xs"
                      disabled={busy}
                      onClick={() => void removeDomain(d.id)}
                    >
                      解绑
                    </Button>
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-xs text-stone-600">
                  <div>
                    TXT：
                    <code className="ml-1 rounded bg-white px-1">
                      _todoplan-verify.{d.domain}
                    </code>{" "}
                    ={" "}
                    <code className="rounded bg-white px-1">
                      {d.verifyToken}
                    </code>
                  </div>
                  {platformCnameTarget ? (
                    <div>
                      或 CNAME：
                      <code className="ml-1 rounded bg-white px-1">
                        {d.domain}
                      </code>{" "}
                      →{" "}
                      <code className="rounded bg-white px-1">
                        {platformCnameTarget}
                      </code>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-base font-semibold">默认落地工作区</h2>
        <p className="mb-3 text-sm text-muted">
          访问域名根路径（如 plan.3o.pw/）时进入的工作区（须为自己创建的）
        </p>
        <div className="flex flex-wrap gap-2">
          <select
            className="input max-w-xs"
            value={defaultWs}
            onChange={(e) => setDefaultWs(e.target.value)}
          >
            <option value="">（自动取最早创建的）</option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} (/{w.slug})
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void saveDefault()}
          >
            保存
          </Button>
        </div>
        {workspaces.length === 0 ? (
          <p className="mt-2 text-xs text-muted">
            你还没有创建工作区。创建后可在此设为默认落地。
          </p>
        ) : null}
      </Card>
    </div>
  );
}
