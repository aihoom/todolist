import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api";
import { normalizeSlug, validateSlug } from "@/lib/slug";
import { isSlugTaken } from "@/lib/domain";

/**
 * 设置工作区后缀前预检：全站唯一
 * GET /api/workspaces/slug-check?slug=aihoom&excludeId=可选
 */
export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("slug")?.trim() ?? "";
    const excludeId = searchParams.get("excludeId") ?? undefined;
    const slug = normalizeSlug(raw);
    const formatError = validateSlug(slug);
    if (formatError) {
      return jsonOk({
        slug,
        available: false,
        reason: formatError,
      });
    }
    const taken = await isSlugTaken(slug, excludeId);
    return jsonOk({
      slug,
      available: !taken,
      reason: taken ? "该后缀已被其他工作区占用，请换一个" : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
