import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import {
  buildObjectKey,
  extFromMime,
  getStorage,
} from "@/lib/storage";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const file = form.get("avatar");

    if (!file || !(file instanceof File)) {
      return jsonError("请选择头像图片", 400);
    }
    if (!ALLOWED.has(file.type)) {
      return jsonError("仅支持 JPG / PNG / WebP / GIF", 400);
    }
    if (file.size > MAX_BYTES) {
      return jsonError("头像不能超过 2MB", 400);
    }

    const ext = extFromMime(file.type);
    const key = buildObjectKey("avatars", `${user.id}.${ext}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getStorage();
    const { url } = await storage.put({
      key,
      body: buffer,
      contentType: file.type,
    });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: url },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        bio: true,
      },
    });

    return jsonOk({ user: updated, storage: storage.name });
  } catch (error) {
    return handleApiError(error);
  }
}
