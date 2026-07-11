import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { AdminShell } from "@/components/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // login 页单独处理，避免循环
  // Next 无法在 layout 轻易知 pathname；用子 layout 拆分更好
  // 这里：非 login 需要 session，login 由 page 自己处理
  return <>{children}</>;
}

export async function requireAdminPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  return admin;
}

export function AdminPageShell({
  admin,
  children,
}: {
  admin: { name: string; email: string };
  children: React.ReactNode;
}) {
  return <AdminShell admin={admin}>{children}</AdminShell>;
}
