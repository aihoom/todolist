"use client";

import { FormEvent, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { SiteSettingsDTO } from "@/lib/site-settings";
import {
  Button,
  Card,
  ErrorBanner,
  Field,
  Input,
  SuccessBanner,
} from "./ui";

export function AdminBrandingClient({
  initial,
}: {
  initial: SiteSettingsDTO;
}) {
  const [settings, setSettings] = useState(initial);
  const [siteName, setSiteName] = useState(initial.siteName);
  const [loginTagline, setLoginTagline] = useState(
    initial.loginTagline ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const favRef = useRef<HTMLInputElement>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api<{ settings: SiteSettingsDTO }>(
        "/api/admin/settings",
        {
          method: "PATCH",
          json: {
            siteName,
            loginTagline: loginTagline || null,
          },
        }
      );
      setSettings(res.settings);
      setSuccess("已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function upload(kind: "logo" | "favicon", file: File | null) {
    if (!file) return;
    setError(null);
    setSuccess(null);
    try {
      const form = new FormData();
      form.append("kind", kind);
      form.append("file", file);
      const res = await fetch("/api/admin/branding/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上传失败");
      setSettings(data.settings);
      setSuccess(kind === "logo" ? "Logo 已更新" : "Favicon 已更新");
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <Card className="p-5">
        <form onSubmit={save}>
          <Field label="站点名称">
            <Input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              required
            />
          </Field>
          <Field label="登录页副标题">
            <Input
              value={loginTagline}
              onChange={(e) => setLoginTagline(e.target.value)}
              placeholder="和重要的人一起规划日常"
            />
          </Field>
          <Button type="submit" disabled={saving}>
            {saving ? "保存中…" : "保存文案"}
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">图标</h2>
        <div className="mb-4 flex items-center gap-4">
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logoUrl}
              alt="logo"
              className="h-12 w-12 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
              TP
            </div>
          )}
          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => logoRef.current?.click()}
            >
              上传 Logo
            </Button>
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void upload("logo", e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          {settings.faviconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.faviconUrl}
              alt="favicon"
              className="h-8 w-8 object-contain"
            />
          ) : (
            <div className="text-xs text-muted">未设置 Favicon</div>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => favRef.current?.click()}
          >
            上传 Favicon
          </Button>
          <input
            ref={favRef}
            type="file"
            accept="image/*,.ico"
            className="hidden"
            onChange={(e) =>
              void upload("favicon", e.target.files?.[0] ?? null)
            }
          />
        </div>
      </Card>
    </div>
  );
}
