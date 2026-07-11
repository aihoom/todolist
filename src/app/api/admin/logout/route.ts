import { destroyAdminSession, getAdminSession, writeAudit } from "@/lib/admin";
import { jsonOk } from "@/lib/api";

export async function POST() {
  const admin = await getAdminSession();
  if (admin) {
    await writeAudit(admin.id, "admin.logout");
  }
  await destroyAdminSession();
  return jsonOk({ ok: true });
}
