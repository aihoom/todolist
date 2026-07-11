import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { profileSelect, toProfileUser } from "@/lib/profile";
import {
  buildObjectKey,
  extFromMime,
  getStorage,
} from "@/lib/storage";
import { getFormFile } from "@/lib/upload-form";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const uploaded = getFormFile(form, "background");

    if (!uploaded) {
      return jsonError("请选择背景图片", 400);
    }
    if (!ALLOWED.has(uploaded.type)) {
      return jsonError("仅支持 JPG / PNG / WebP / GIF", 400);
    }
    if (uploaded.size > MAX_BYTES) {
      return jsonError("背景图不能超过 5MB", 400);
    }

    const ext = extFromMime(uploaded.type);
    const key = buildObjectKey("backgrounds", `${user.id}.${ext}`);
    const buffer = Buffer.from(await uploaded.file.arrayBuffer());
    const storage = getStorage();
    const { url } = await storage.put({
      key,
      body: buffer,
      contentType: uploaded.type,
    });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { backgroundImageUrl: url },
      select: profileSelect,
    });

    return jsonOk({ user: toProfileUser(updated), storage: storage.name });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { backgroundImageUrl: null },
      select: profileSelect,
    });
    return jsonOk({ user: toProfileUser(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}
