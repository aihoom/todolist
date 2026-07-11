import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, writeAudit } from "@/lib/admin";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { verifyCustomDomainDns } from "@/lib/domain";
import { getSiteSettings } from "@/lib/site-settings";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  action: z.enum(["force_active", "force_pending", "reverify", "delete"]),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    const record = await prisma.customDomain.findUnique({ where: { id } });
    if (!record) return jsonError("域名不存在", 404);

    if (body.action === "delete") {
      await prisma.customDomain.delete({ where: { id } });
      await writeAudit(admin.id, "domain.delete", "domain", id, {
        domain: record.domain,
      });
      return jsonOk({ ok: true });
    }

    if (body.action === "force_active") {
      const domain = await prisma.customDomain.update({
        where: { id },
        data: {
          status: "active",
          verifiedAt: new Date(),
          lastError: null,
          lastCheckedAt: new Date(),
        },
      });
      await writeAudit(admin.id, "domain.force_active", "domain", id);
      return jsonOk({ domain });
    }

    if (body.action === "force_pending") {
      const domain = await prisma.customDomain.update({
        where: { id },
        data: { status: "pending", lastError: null },
      });
      await writeAudit(admin.id, "domain.force_pending", "domain", id);
      return jsonOk({ domain });
    }

    // reverify
    const settings = await getSiteSettings();
    const result = await verifyCustomDomainDns(
      record.domain,
      record.verifyToken,
      settings.platformCnameTarget
    );
    const domain = await prisma.customDomain.update({
      where: { id },
      data: {
        lastCheckedAt: new Date(),
        lastError: result.ok ? null : result.error ?? "失败",
        status: result.ok ? "active" : "failed",
        verifiedAt: result.ok ? new Date() : record.verifiedAt,
      },
    });
    await writeAudit(admin.id, "domain.reverify", "domain", id, result);
    return jsonOk({ domain, verify: result });
  } catch (error) {
    return handleApiError(error);
  }
}
