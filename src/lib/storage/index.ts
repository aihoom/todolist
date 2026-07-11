import type { StorageDriver, StorageDriverName } from "./types";
import { createLocalStorage } from "./local";
import { createR2Storage } from "./r2";

export type { StorageDriver, PutObjectInput, PutObjectResult } from "./types";
export { createR2BindingStorage } from "./r2-binding.stub";

let cached: StorageDriver | null = null;

/**
 * 根据 STORAGE_DRIVER 选择驱动：
 * - local（默认）：本机 public/uploads 或 UPLOAD_DIR，经 /uploads 路由提供
 * - r2：Cloudflare R2（S3 API，Node 环境）
 *
 * Workers 环境请直接用 createR2BindingStorage(env.BUCKET, publicUrl)
 */
export function getStorage(): StorageDriver {
  if (cached) return cached;

  const name = (process.env.STORAGE_DRIVER || "local").toLowerCase() as
    | StorageDriverName
    | string;

  if (name === "r2") {
    cached = createR2Storage();
  } else if (name === "r2-binding") {
    throw new Error(
      "STORAGE_DRIVER=r2-binding 仅用于 Cloudflare Workers；请在 Workers 入口用 createR2BindingStorage(env.BUCKET, R2_PUBLIC_URL)"
    );
  } else {
    cached = createLocalStorage();
  }
  return cached;
}

/** 测试或热切换时清空缓存 */
export function resetStorageCache() {
  cached = null;
}

export function getStorageDriverName(): StorageDriverName {
  const name = (process.env.STORAGE_DRIVER || "local").toLowerCase();
  return name === "r2" ? "r2" : "local";
}

/** 生成带用户/类型前缀的对象键 */
export function buildObjectKey(
  folder: "avatars" | "backgrounds" | "branding",
  filename: string
) {
  // 去掉路径穿越
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${folder}/${safe}`;
}

export function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime.includes("icon")) return "ico";
  return "jpg";
}
