"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import type { ProfileUser } from "@/lib/types";
import { disableWebPush, enableWebPush } from "@/lib/webpush-client";
import {
  Avatar,
  Button,
  Card,
  ErrorBanner,
  Field,
  Input,
  SuccessBanner,
  Textarea,
} from "./ui";
import { ProfileDomainSection } from "./profile-domain-section";

const BG_PRESETS = [
  {
    name: "晨雾山峦",
    url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80",
  },
  {
    name: "暖色日落",
    url: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1600&q=80",
  },
  {
    name: "柔和云海",
    url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1600&q=80",
  },
  {
    name: "静谧湖面",
    url: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1600&q=80",
  },
];

const CSS_EXAMPLE = `/* 示例：让主色更偏紫色 */
:root {
  --primary: #7c3aed;
  --primary-hover: #6d28d9;
  --ring: #a78bfa;
}

/* 卡片圆角更大一点 */
.card {
  border-radius: 1.25rem;
}`;

const HTML_EXAMPLE = `<!-- 右下角装饰文字，不挡点击 -->
<div style="position:fixed;right:1.5rem;bottom:1.5rem;font-size:12px;opacity:.45;color:#44403c;font-weight:600;letter-spacing:.05em;">
  我们的小计划 ✦
</div>`;

type DomainRow = {
  id: string;
  domain: string;
  status: string;
  verifyToken: string;
  lastError: string | null;
  createdAt: string;
};

type OwnedWs = { id: string; name: string; slug: string };

export function ProfileClient({
  initialUser,
  vapidConfigured,
  domains = [],
  ownedWorkspaces = [],
  defaultWorkspaceId = null,
  platformCnameTarget = null,
}: {
  initialUser: ProfileUser;
  vapidConfigured: boolean;
  domains?: DomainRow[];
  ownedWorkspaces?: OwnedWs[];
  defaultWorkspaceId?: string | null;
  platformCnameTarget?: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState(initialUser);
  const [name, setName] = useState(initialUser.name);
  const [bio, setBio] = useState(initialUser.bio ?? "");
  const [serverChanKey, setServerChanKey] = useState(
    initialUser.serverChanKey ?? ""
  );
  const [notifyOnTodoCreate, setNotifyOnTodoCreate] = useState(
    initialUser.notifyOnTodoCreate
  );
  const [notifyOnTodoComplete, setNotifyOnTodoComplete] = useState(
    initialUser.notifyOnTodoComplete
  );
  const [notifyOnDueSoon, setNotifyOnDueSoon] = useState(
    initialUser.notifyOnDueSoon
  );
  const [bgUrl, setBgUrl] = useState(initialUser.backgroundImageUrl ?? "");
  const [overlay, setOverlay] = useState(initialUser.backgroundOverlay ?? 70);
  const [customCss, setCustomCss] = useState(initialUser.customCss ?? "");
  const [customHtml, setCustomHtml] = useState(initialUser.customHtml ?? "");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [testing, setTesting] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const data = await api<{ user: ProfileUser }>("/api/profile", {
        method: "PATCH",
        json: {
          name,
          bio,
          serverChanKey,
          notifyOnTodoCreate,
          notifyOnTodoComplete,
          notifyOnDueSoon,
        },
      });
      setUser(data.user);
      setSuccess("资料已保存");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function saveTheme(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setSuccess(null);
    setSavingTheme(true);
    try {
      const data = await api<{ user: ProfileUser }>("/api/profile", {
        method: "PATCH",
        json: {
          backgroundImageUrl: bgUrl.trim() || null,
          backgroundOverlay: overlay,
          customCss: customCss.trim() || null,
          customHtml: customHtml.trim() || null,
        },
      });
      setUser(data.user);
      setBgUrl(data.user.backgroundImageUrl ?? "");
      setOverlay(data.user.backgroundOverlay);
      setCustomCss(data.user.customCss ?? "");
      setCustomHtml(data.user.customHtml ?? "");
      setSuccess("主题已保存，页面将刷新以应用效果");
      // 全量刷新以应用 layout 中的主题
      setTimeout(() => {
        window.location.reload();
      }, 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存主题失败");
      setSavingTheme(false);
    }
  }

  async function onAvatarChange(file: File | null) {
    if (!file) return;
    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : `上传失败（HTTP ${res.status}）`
        );
      }
      const nextUrl = data.user?.avatarUrl as string | undefined;
      if (!nextUrl) throw new Error("上传成功但未返回头像地址");
      setUser((u) => ({ ...u, avatarUrl: nextUrl }));
      setSuccess("头像已更新");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onBackgroundUpload(file: File | null) {
    if (!file) return;
    setError(null);
    setSuccess(null);
    setUploadingBg(true);
    try {
      const form = new FormData();
      form.append("background", file);
      const res = await fetch("/api/profile/background", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : `上传失败（HTTP ${res.status}）`
        );
      }
      if (!data.user) throw new Error("上传成功但未返回用户信息");
      setUser(data.user);
      setBgUrl(data.user.backgroundImageUrl ?? "");
      setSuccess("背景图已上传，即将刷新页面…");
      setTimeout(() => window.location.reload(), 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
      setUploadingBg(false);
    } finally {
      if (bgFileRef.current) bgFileRef.current.value = "";
    }
  }

  async function clearBackground() {
    setError(null);
    setSuccess(null);
    setUploadingBg(true);
    try {
      const data = await api<{ user: ProfileUser }>("/api/profile/background", {
        method: "DELETE",
      });
      setUser(data.user);
      setBgUrl("");
      setSuccess("已恢复默认背景");
      setTimeout(() => window.location.reload(), 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "清除失败");
      setUploadingBg(false);
    }
  }

  async function testServerChan() {
    setError(null);
    setSuccess(null);
    setTesting(true);
    try {
      const res = await fetch("/api/notify/test-serverchan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendKey: serverChanKey || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || data.error || "测试失败");
      }
      setSuccess(data.message || "测试推送已发送");
    } catch (err) {
      setError(err instanceof Error ? err.message : "测试失败");
    } finally {
      setTesting(false);
    }
  }

  async function toggleWebPush() {
    setError(null);
    setSuccess(null);
    setPushBusy(true);
    try {
      if (user.hasWebPush) {
        await disableWebPush();
        setUser((u) => ({ ...u, hasWebPush: false }));
        setSuccess("已关闭浏览器推送");
      } else {
        await enableWebPush();
        setUser((u) => ({ ...u, hasWebPush: true }));
        setSuccess("浏览器推送已开启");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-muted hover:text-primary"
        >
          ← 返回工作区
        </Link>
      </div>

      <h1 className="mb-2 text-2xl font-bold tracking-tight text-stone-900">
        个人资料
      </h1>
      <p className="mb-6 text-sm text-muted">
        完善基本信息、自定义域名、推送与界面美化（主题仅你登录时生效）。
      </p>

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <Card className="mb-6 p-5">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size={72} />
          <div className="flex-1">
            <div className="font-semibold text-stone-900">{user.name}</div>
            <div className="text-sm text-muted">{user.email}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                className="text-sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? "上传中…" : "更换头像"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => onAvatarChange(e.target.files?.[0] ?? null)}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              支持 JPG / PNG / WebP / GIF，最大 2MB
            </p>
          </div>
        </div>
      </Card>

      <Card className="mb-6 p-5">
        <h2 className="mb-4 text-base font-semibold">基本信息</h2>
        <form onSubmit={saveProfile}>
          <Field label="昵称">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={40}
            />
          </Field>
          <Field label="个人简介">
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="例如：喜欢提前规划周末行程"
              rows={3}
              maxLength={300}
            />
          </Field>
          <Button type="submit" disabled={saving}>
            {saving ? "保存中…" : "保存资料"}
          </Button>
        </form>
      </Card>

      <ProfileDomainSection
        initialDomains={domains}
        workspaces={ownedWorkspaces}
        defaultWorkspaceId={defaultWorkspaceId}
        platformCnameTarget={platformCnameTarget}
      />

      {/* 界面美化 */}
      <Card className="mb-6 p-5">
        <h2 className="mb-1 text-base font-semibold">界面美化</h2>
        <p className="mb-4 text-sm text-muted">
          背景图、自定义 CSS / HTML 只影响<strong>你自己</strong>
          登录后看到的页面，不会改变对方的界面。
        </p>

        <div className="mb-4">
          <div className="label">当前背景预览</div>
          <div
            className="relative h-28 overflow-hidden rounded-xl border border-border bg-stone-100"
            style={
              bgUrl
                ? {
                    backgroundImage: `linear-gradient(rgba(246,244,239,${
                      overlay / 100
                    }), rgba(246,244,239,${overlay / 100})), url(${bgUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            {!bgUrl ? (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                默认渐变背景
              </div>
            ) : null}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="text-sm"
            disabled={uploadingBg}
            onClick={() => bgFileRef.current?.click()}
          >
            {uploadingBg ? "上传中…" : "上传背景图"}
          </Button>
          <input
            ref={bgFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) =>
              void onBackgroundUpload(e.target.files?.[0] ?? null)
            }
          />
          {bgUrl ? (
            <Button
              type="button"
              variant="ghost"
              className="text-sm"
              disabled={uploadingBg}
              onClick={() => void clearBackground()}
            >
              清除背景
            </Button>
          ) : null}
        </div>
        <p className="mb-3 text-xs text-muted">
          上传最大 5MB；也可使用下方预设或外链 URL
        </p>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BG_PRESETS.map((p) => (
            <button
              key={p.url}
              type="button"
              title={p.name}
              onClick={() => setBgUrl(p.url)}
              className={`h-16 overflow-hidden rounded-lg border-2 bg-cover bg-center transition ${
                bgUrl === p.url
                  ? "border-primary ring-2 ring-teal-200"
                  : "border-transparent hover:border-teal-300"
              }`}
              style={{ backgroundImage: `url(${p.url})` }}
            >
              <span className="sr-only">{p.name}</span>
            </button>
          ))}
        </div>

        <Field label="背景图 URL（可选）" hint="http(s) 链接或站内 /uploads/... 路径">
          <Input
            value={bgUrl}
            onChange={(e) => setBgUrl(e.target.value)}
            placeholder="https://... 或留空使用上传/默认"
          />
        </Field>

        <Field
          label={`背景遮罩：${overlay}%`}
          hint="遮罩越深，文字越清晰；0 为完全透明"
        >
          <input
            type="range"
            min={0}
            max={100}
            value={overlay}
            onChange={(e) => setOverlay(Number(e.target.value))}
            className="w-full accent-teal-700"
          />
        </Field>

        <Field
          label="自定义 CSS"
          hint="可改颜色、圆角、间距等。已拦截 expression / @import 等危险写法"
        >
          <Textarea
            value={customCss}
            onChange={(e) => setCustomCss(e.target.value)}
            placeholder={CSS_EXAMPLE}
            rows={8}
            className="font-mono text-xs"
          />
        </Field>
        <button
          type="button"
          className="mb-4 text-xs font-medium text-primary hover:underline"
          onClick={() => setCustomCss(CSS_EXAMPLE)}
        >
          填入 CSS 示例
        </button>

        <Field
          label="自定义 HTML（装饰层）"
          hint="渲染在页面底层，默认不接收点击。脚本/iframe 等会被过滤"
        >
          <Textarea
            value={customHtml}
            onChange={(e) => setCustomHtml(e.target.value)}
            placeholder={HTML_EXAMPLE}
            rows={6}
            className="font-mono text-xs"
          />
        </Field>
        <button
          type="button"
          className="mb-4 text-xs font-medium text-primary hover:underline"
          onClick={() => setCustomHtml(HTML_EXAMPLE)}
        >
          填入 HTML 示例
        </button>

        <Button
          type="button"
          disabled={savingTheme}
          onClick={() => void saveTheme()}
        >
          {savingTheme ? "保存中…" : "保存并应用主题"}
        </Button>
      </Card>

      <Card className="mb-6 p-5">
        <h2 className="mb-1 text-base font-semibold">通知偏好</h2>
        <p className="mb-4 text-sm text-muted">
          控制哪些事件会触发推送（Server酱 + 浏览器推送共用）
        </p>
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={notifyOnTodoCreate}
              onChange={(e) => setNotifyOnTodoCreate(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300"
            />
            有人新增待办时通知我
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={notifyOnTodoComplete}
              onChange={(e) => setNotifyOnTodoComplete(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300"
            />
            有人完成待办时通知我
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={notifyOnDueSoon}
              onChange={(e) => setNotifyOnDueSoon(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300"
            />
            截止日期临近 / 逾期时通知我
          </label>
        </div>
        <Button
          type="button"
          className="mt-4"
          disabled={saving}
          onClick={(e) => {
            e.preventDefault();
            void saveProfile(e as unknown as FormEvent);
          }}
        >
          保存通知偏好
        </Button>
      </Card>

      <Card className="mb-6 p-5">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-base font-semibold">Server酱 推送</h2>
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
            可插拔通道
          </span>
        </div>
        <p className="mb-4 text-sm text-muted">
          在{" "}
          <a
            href="https://sct.ftqq.com/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            sct.ftqq.com
          </a>{" "}
          获取 SendKey，即可把提醒推到微信。
        </p>
        <Field label="SendKey">
          <Input
            value={serverChanKey}
            onChange={(e) => setServerChanKey(e.target.value)}
            placeholder="SCT..."
            autoComplete="off"
            className="font-mono text-sm"
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={saving}
            onClick={(e) => {
              e.preventDefault();
              void saveProfile(e as unknown as FormEvent);
            }}
          >
            保存 SendKey
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={testing || !serverChanKey.trim()}
            onClick={() => void testServerChan()}
          >
            {testing ? "发送中…" : "发送测试推送"}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-base font-semibold">浏览器推送</h2>
        <p className="mb-4 text-sm text-muted">
          支持的浏览器中开启后可收到系统通知（需 HTTPS 或 localhost）。
        </p>
        {!vapidConfigured ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            服务端尚未配置 VAPID 密钥。
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            状态：{" "}
            <strong>{user.hasWebPush ? "已开启" : "未开启"}</strong>
          </div>
          <Button
            type="button"
            variant={user.hasWebPush ? "secondary" : "primary"}
            disabled={pushBusy || !vapidConfigured}
            onClick={() => void toggleWebPush()}
          >
            {pushBusy
              ? "处理中…"
              : user.hasWebPush
                ? "关闭浏览器推送"
                : "开启浏览器推送"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
