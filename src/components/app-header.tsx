"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Avatar, Button } from "./ui";

export function AppHeader({
  user,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = [
    { href: "/dashboard", label: "工作区" },
    { href: "/personal", label: "私人待办" },
  ];

  return (
    <header className="border-b border-border/80 bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-sm">
              TP
            </span>
            <div className="hidden sm:block">
              <div className="text-sm font-bold tracking-tight text-stone-900">
                TodoPlan
              </div>
              <div className="text-[11px] text-muted">共享计划工作区</div>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {nav.map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-teal-50 text-primary"
                      : "text-muted hover:bg-stone-100 hover:text-stone-800"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-stone-100"
          >
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size={30} />
            <div className="hidden text-sm sm:block">
              <div className="font-semibold leading-tight">{user.name}</div>
              <div className="text-[11px] text-muted">个人资料</div>
            </div>
          </Link>
          <Button variant="ghost" onClick={logout} className="text-sm">
            退出
          </Button>
        </div>
      </div>
    </header>
  );
}
