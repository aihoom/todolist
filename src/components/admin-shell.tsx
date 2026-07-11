"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Button } from "./ui";

const NAV = [
  { href: "/admin", label: "仪表盘" },
  { href: "/admin/users", label: "用户" },
  { href: "/admin/workspaces", label: "工作区" },
  { href: "/admin/domains", label: "域名" },
  { href: "/admin/invites", label: "邀请链接" },
  { href: "/admin/branding", label: "站点品牌" },
  { href: "/admin/settings", label: "系统设置" },
];

export function AdminShell({
  admin,
  children,
}: {
  admin: { name: string; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await api("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="border-b border-stone-200 bg-stone-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-sm font-bold tracking-wide">TodoPlan 运营后台</div>
              <div className="text-[11px] text-stone-400">仅管理员</div>
            </div>
            <nav className="hidden flex-wrap gap-1 md:flex">
              {NAV.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-2.5 py-1.5 text-sm ${
                      active
                        ? "bg-white/15 font-semibold text-white"
                        : "text-stone-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-stone-300 sm:inline">
              {admin.name}
            </span>
            <Button
              type="button"
              variant="secondary"
              className="!py-1.5 !text-xs"
              onClick={() => void logout()}
            >
              退出
            </Button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-4 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1 text-xs text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
