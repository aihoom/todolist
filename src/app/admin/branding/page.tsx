import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { AdminShell } from "@/components/admin-shell";
import { getSiteSettings } from "@/lib/site-settings";
import { AdminBrandingClient } from "@/components/admin-branding-client";

export default async function AdminBrandingPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  const settings = await getSiteSettings();

  return (
    <AdminShell admin={admin}>
      <h1 className="mb-1 text-2xl font-bold">站点品牌</h1>
      <p className="mb-6 text-sm text-muted">名称、Logo、Favicon、登录文案</p>
      <AdminBrandingClient initial={settings} />
    </AdminShell>
  );
}
