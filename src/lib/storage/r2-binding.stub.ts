/**
 * Cloudflare Workers R2 Binding 驱动（骨架）
 *
 * 在 Workers 运行时：
 *   env.TODOPLAN_BUCKET  // wrangler.toml [[r2_buckets]]
 *
 * 与 Node 版 createR2Storage() 实现同一 StorageDriver 接口，
 * 便于 OpenNext / Workers 部署时切换，无需改业务上传代码。
 *
 * 启用方式（未来）：
 *   STORAGE_DRIVER=r2-binding
 *   并在 Workers 环境注入 R2 bucket binding + R2_PUBLIC_URL
 */

import type { PutObjectInput, PutObjectResult, StorageDriver } from "./types";

/** Workers 环境最小类型，避免在 Node 构建时强依赖 @cloudflare/workers-types */
type R2BucketLike = {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | string | Blob,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
};

export function createR2BindingStorage(
  bucket: R2BucketLike,
  publicBaseUrl: string
): StorageDriver {
  const publicBase = publicBaseUrl.replace(/\/$/, "");
  if (!publicBase) {
    throw new Error("R2_PUBLIC_URL 未设置");
  }

  return {
    name: "r2",

    async put(input: PutObjectInput): Promise<PutObjectResult> {
      const body =
        input.body instanceof Buffer
          ? input.body
          : Buffer.from(input.body);
      await bucket.put(input.key, body, {
        httpMetadata: {
          contentType: input.contentType,
          cacheControl:
            input.cacheControl || "public, max-age=31536000, immutable",
        },
      });
      return {
        key: input.key,
        url: `${publicBase}/${input.key}?t=${Date.now()}`,
      };
    },

    async delete(key: string): Promise<void> {
      await bucket.delete(key);
    },
  };
}
