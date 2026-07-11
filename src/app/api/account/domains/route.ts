import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import {
  newVerifyToken,
  normalizeDomain,
  validateDomain,
  verifyCustomDomainDns,
} from "@/lib/domain";
import { getSiteSettings } from "@/lib/site-settings";

export async function GET() {
  try {
    const user = await requireUser();
    const domains = await prisma.customDomain.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    const settings = await getSiteSettings();
    return jsonOk({
      domains,
      platformCnameTarget: settings.platformCnameTarget,
      defaultWorkspaceId: (
        await prisma.user.findUnique({
          where: { id: user.id },
          select: { defaultWorkspaceId: true },
        })
      )?.defaultWorkspaceId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  domain: z.string().trim().min(3).max(200),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = createSchema.parse(await request.json());
    const domain = normalizeDomain(body.domain);
    const err = validateDomain(domain);
    if (err) return jsonError(err, 400);

    const taken = await prisma.customDomain.findUnique({ where: { domain } });
    if (taken) {
      return jsonError(
        taken.userId === user.id ? "你已添加过该域名" : "该域名已被其他账号绑定",
        409
      );
    }

    // 一期：每账号最多 3 个域名
    const count = await prisma.customDomain.count({
      where: { userId: user.id },
    });
    if (count >= 3) return jsonError("每个账号最多绑定 3 个域名", 400);

    const record = await prisma.customDomain.create({
      data: {
        userId: user.id,
        domain,
        verifyToken: newVerifyToken(),
        status: "pending",
      },
    });

    const settings = await getSiteSettings();
    return jsonOk(
      {
        domain: record,
        instructions: {
          txt: {
            host: `_todoplan-verify.${domain}`,
            value: record.verifyToken,
          },
          cname: settings.platformCnameTarget
            ? { host: domain, value: settings.platformCnameTarget }
            : null,
        },
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
