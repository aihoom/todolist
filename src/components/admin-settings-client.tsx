"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/client";
import type { SiteSettingsDTO } from "@/lib/site-settings";
import {
  Button,
  Card,
  ErrorBanner,
  Field,
  Input,
  SuccessBanner,
  Textarea,
} from "./ui";

export function AdminSettingsClient({
  initial,
}: {
  initial: SiteSettingsDTO;
}) {
  const [cname, setCname] = useState(initial.platformCnameTarget ?? "");
  const [subRoot, setSubRoot] = useState(initial.platformSubdomainRoot ?? "");
  const [regOpen, setRegOpen] = useState(initial.registrationOpen);
  const [maintenance, setMaintenance] = useState(
    initial.maintenanceMessage ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        json: {
          platformCnameTarget: cname || null,
          platformSubdomainRoot: subRoot || null,
          registrationOpen: regOpen,
          maintenanceMessage: maintenance || null,
        },
      });
      setSuccess("设置已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-xl p-5">
      <ErrorBanner message={error} />
      <SuccessBanner message={success} />
      <form onSubmit={save}>
        <Field
          label="用户 CNAME 目标"
          hint="用户绑定域名时提示 CNAME 到此主机，如 cname.todoplan.app"
        >
          <Input
            value={cname}
            onChange={(e) => setCname(e.target.value)}
            placeholder="cname.example.com"
            className="font-mono text-sm"
          />
        </Field>
        <Field
          label="平台二级域根"
          hint="分发接口用，如 todo.3o.pw → 生成 aihoom.todo.3o.pw"
        >
          <Input
            value={subRoot}
            onChange={(e) => setSubRoot(e.target.value)}
            placeholder="todo.3o.pw"
            className="font-mono text-sm"
          />
        </Field>
        <label className="mb-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={regOpen}
            onChange={(e) => setRegOpen(e.target.checked)}
            className="h-4 w-4"
          />
          开放注册
        </label>
        <Field label="维护公告（空=不显示）">
          <Textarea
            value={maintenance}
            onChange={(e) => setMaintenance(e.target.value)}
            rows={3}
            placeholder="系统维护通知…"
          />
        </Field>
        <Button type="submit" disabled={saving}>
          {saving ? "保存中…" : "保存"}
        </Button>
      </form>
    </Card>
  );
}
