import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { normalizeSlug, validateSlug } from "@/lib/slug";
import { isSlugTaken } from "@/lib/domain";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(200).nullable().optional(),
  slug: z.string().trim().min(2).max(40).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const ws = await prisma.workspace.findUnique({ where: { id } });
    if (!ws) return jsonError("工作区不存在", 404);
    if (ws.ownerId !== user.id) {
      throw new AuthError("仅工作区创建者可修改设置", 403);
    }

    const body = schema.parse(await request.json());
    const data: { name?: string; description?: string | null; slug?: string } =
      {};

    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.slug !== undefined) {
      const slug = normalizeSlug(body.slug);
      const err = validateSlug(slug);
      if (err) return jsonError(err, 400);
      // 用户手动设置：占用则直接报错，不自动改名
      if (await isSlugTaken(slug, id)) {
        return jsonError("该后缀已被其他工作区占用，请换一个", 409);
      }
      data.slug = slug;
    }

    const workspace = await prisma.workspace.update({
      where: { id },
      data,
    });

    return jsonOk({ workspace });
  } catch (error) {
    return handleApiError(error);
  }
}
