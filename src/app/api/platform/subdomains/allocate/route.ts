/**
 * 预留：平台二级域名分发接口
 * 例：label=aihoom + root=todo.3o.pw → aihoom.todo.3o.pw
 *
 * 鉴权：登录用户或管理员；一期仅骨架，真正 DNS 开通由运维/外部系统完成。
 */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { getSiteSettings } from "@/lib/site-settings";
import { normalizeSlug, validateSlug } from "@/lib/slug";

const schema = z.object({
  label: z.string().trim().min(2).max(40),
  workspaceId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await request.json());
    const settings = await getSiteSettings();
    const root = settings.platformSubdomainRoot?.trim();
    if (!root) {
      return jsonError(
        "平台尚未配置二级域根（platformSubdomainRoot），暂不可分配",
        503
      );
    }

    const label = normalizeSlug(body.label);
    const err = validateSlug(label);
    if (err) return jsonError(err, 400);

    const fullHost = `${label}.${root}`.toLowerCase();
    const exists = await prisma.platformSubdomain.findUnique({
      where: { fullHost },
    });
    if (exists) return jsonError("该二级域名已被占用", 409);

    if (body.workspaceId) {
      const ws = await prisma.workspace.findFirst({
        where: {
          id: body.workspaceId,
          members: { some: { userId: user.id } },
        },
      });
      if (!ws) return jsonError("工作区不存在或无权关联", 400);
    }

    const row = await prisma.platformSubdomain.create({
      data: {
        userId: user.id,
        workspaceId: body.workspaceId ?? null,
        label,
        fullHost,
        status: "pending",
      },
    });

    return jsonOk(
      {
        subdomain: row,
        message:
          "已预留二级域名记录（pending）。DNS 实际开通需平台运维或后续自动化。",
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const list = await prisma.platformSubdomain.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk({ subdomains: list });
  } catch (error) {
    return handleApiError(error);
  }
}
