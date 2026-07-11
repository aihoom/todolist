import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { AdminShell } from "@/components/admin-shell";
import { getSiteSettings } from "@/lib/site-settings";
import { AdminSettingsClient } from "@/components/admin-settings-client";

export default async function AdminSettingsPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  const settings = await getSiteSettings();

  return (
    <AdminShell admin={admin}>
      <h1 className="mb-1 text-2xl font-bold">系统设置</h1>
      <p className="mb-6 text-sm text-muted">
        CNAME 目标、二级域根、注册开关、维护公告
      </p>
      <AdminSettingsClient initial={settings} />
    </AdminShell>
  );
}
