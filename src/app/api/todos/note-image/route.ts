import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import {
  buildObjectKey,
  extFromMime,
  getStorage,
} from "@/lib/storage";
import { getFormFile } from "@/lib/upload-form";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * 待办备注截图 / 附图上传。
 * 返回可插入 Markdown 的 URL：`![说明](url)`
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const uploaded = getFormFile(form, "image");

    if (!uploaded) {
      return jsonError("请选择图片", 400);
    }
    if (!ALLOWED.has(uploaded.type)) {
      return jsonError("仅支持 JPG / PNG / WebP / GIF", 400);
    }
    if (uploaded.size > MAX_BYTES) {
      return jsonError("图片不能超过 8MB", 400);
    }

    const ext = extFromMime(uploaded.type);
    const stamp = `${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const key = buildObjectKey("notes", `${user.id}-${stamp}.${ext}`);
    const storage = getStorage();
    const { url } = await storage.put({
      key,
      body: Buffer.from(await uploaded.file.arrayBuffer()),
      contentType: uploaded.type,
    });

    // 写入 Markdown 时去掉 cache-bust query，避免污染正文；展示端可直接用
    const cleanUrl = url.split("?")[0] || url;

    return jsonOk({
      url: cleanUrl,
      markdown: `![截图](${cleanUrl})`,
      storage: storage.name,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
