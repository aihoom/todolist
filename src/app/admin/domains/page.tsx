import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/lib/prisma";
import { AdminDomainsClient } from "@/components/admin-domains-client";

export default async function AdminDomainsPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const domains = await prisma.customDomain.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  return (
    <AdminShell admin={admin}>
      <h1 className="mb-1 text-2xl font-bold">域名管理</h1>
      <p className="mb-6 text-sm text-muted">
        用户自助解析验证；你可强制生效、重新验证或解绑
      </p>
      <AdminDomainsClient
        initialDomains={domains.map((d) => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
          verifiedAt: d.verifiedAt?.toISOString() ?? null,
          lastCheckedAt: d.lastCheckedAt?.toISOString() ?? null,
        }))}
      />
    </AdminShell>
  );
}
