"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, Card, ErrorBanner, Field, Input } from "./ui";

type Mode = "login" | "register";

function safeNextPath(next?: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}

export function AuthForm({
  mode,
  inviteCode,
  siteName = "TodoPlan",
  tagline,
  nextPath,
}: {
  mode: Mode;
  inviteCode?: string;
  siteName?: string;
  tagline?: string | null;
  /** 登录成功后跳转（仅允许站内相对路径） */
  nextPath?: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "register") {
        await api("/api/auth/register", {
          method: "POST",
          json: {
            name,
            email,
            password,
            inviteCode: inviteCode || undefined,
          },
        });
      } else {
        await api("/api/auth/login", {
          method: "POST",
          json: { email, password },
        });
      }
      router.push(safeNextPath(nextPath));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md p-8">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
          <span>✦</span> {siteName} 共享计划
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          {mode === "login" ? "欢迎回来" : "创建账号"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {mode === "login"
            ? tagline || "登录后查看你们共同的工作区与待办"
            : inviteCode
              ? `使用邀请码 ${inviteCode} 注册`
              : tagline || "注册后即可创建工作区，邀请对方一起规划"}
        </p>
      </div>

      <ErrorBanner message={error} />

      <form onSubmit={onSubmit}>
        {mode === "register" ? (
          <Field label="昵称">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：小明"
              required
              autoComplete="name"
            />
          </Field>
        ) : null}

        <Field label="邮箱">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </Field>

        <Field
          label="密码"
          hint={mode === "register" ? "至少 6 位" : undefined}
        >
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={mode === "register" ? 6 : 1}
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
          />
        </Field>

        <Button type="submit" className="mt-2 w-full" disabled={loading}>
          {loading
            ? "请稍候…"
            : mode === "login"
              ? "登录"
              : "注册并进入"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            还没有账号？{" "}
            <Link
              href="/register"
              className="font-semibold text-primary hover:underline"
            >
              去注册
            </Link>
          </>
        ) : (
          <>
            已有账号？{" "}
            <Link
              href="/login"
              className="font-semibold text-primary hover:underline"
            >
              去登录
            </Link>
          </>
        )}
      </p>
    </Card>
  );
}
