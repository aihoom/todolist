import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { verifyCustomDomainDns } from "@/lib/domain";
import { getSiteSettings } from "@/lib/site-settings";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const record = await prisma.customDomain.findUnique({ where: { id } });
    if (!record || record.userId !== user.id) {
      return jsonError("域名记录不存在", 404);
    }

    const settings = await getSiteSettings();
    const result = await verifyCustomDomainDns(
      record.domain,
      record.verifyToken,
      settings.platformCnameTarget
    );

    const updated = await prisma.customDomain.update({
      where: { id },
      data: {
        lastCheckedAt: new Date(),
        lastError: result.ok ? null : result.error ?? "验证失败",
        status: result.ok ? "active" : "failed",
        verifiedAt: result.ok ? new Date() : record.verifiedAt,
      },
    });

    if (!result.ok) {
      return jsonError(result.error || "DNS 验证失败", 400);
    }

    return jsonOk({ domain: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
