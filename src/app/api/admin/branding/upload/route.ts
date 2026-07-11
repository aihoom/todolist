import { requireAdmin, writeAudit } from "@/lib/admin";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import {
  buildObjectKey,
  extFromMime,
  getStorage,
} from "@/lib/storage";

const MAX = 2 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const form = await request.formData();
    const kind = String(form.get("kind") || "");
    const file = form.get("file");
    if (kind !== "logo" && kind !== "favicon") {
      return jsonError("kind 必须是 logo 或 favicon", 400);
    }
    if (!file || !(file instanceof File)) {
      return jsonError("请选择文件", 400);
    }
    if (!ALLOWED.has(file.type) && kind === "logo") {
      return jsonError("Logo 仅支持常见图片格式", 400);
    }
    if (file.size > MAX) return jsonError("文件不能超过 2MB", 400);

    const ext = extFromMime(file.type);
    const key = buildObjectKey("branding", `${kind}.${ext}`);
    const storage = getStorage();
    const { url } = await storage.put({
      key,
      body: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || "application/octet-stream",
    });

    await getSiteSettings();
    const settings = await prisma.siteSettings.update({
      where: { id: "default" },
      data: kind === "logo" ? { logoUrl: url } : { faviconUrl: url },
    });
    await writeAudit(
      admin.id,
      `branding.upload_${kind}`,
      "settings",
      "default",
      { storage: storage.name }
    );
    return jsonOk({ settings, url, storage: storage.name });
  } catch (error) {
    return handleApiError(error);
  }
}
