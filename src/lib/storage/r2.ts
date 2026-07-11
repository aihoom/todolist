import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import type { PutObjectInput, PutObjectResult, StorageDriver } from "./types";

/**
 * Cloudflare R2 驱动（S3 兼容 API）
 *
 * 环境变量：
 * - R2_ACCOUNT_ID
 * - R2_ACCESS_KEY_ID
 * - R2_SECRET_ACCESS_KEY
 * - R2_BUCKET
 * - R2_PUBLIC_URL  公网访问前缀，如 https://pub-xxx.r2.dev 或 https://cdn.example.com
 *
 * 未来 Workers 可用 R2 Binding 实现同一接口（不走 S3 HTTP）。
 */
export function createR2Storage(): StorageDriver {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBase = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2 未配置完整：需要 R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET"
    );
  }
  if (!publicBase) {
    throw new Error(
      "R2_PUBLIC_URL 未设置（R2 公开桶域名或自定义 CDN 域名，用于拼浏览器可访问 URL）"
    );
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return {
    name: "r2",

    async put(input: PutObjectInput): Promise<PutObjectResult> {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
          CacheControl:
            input.cacheControl || "public, max-age=31536000, immutable",
        })
      );
      const url = `${publicBase}/${input.key.replace(/^\/+/, "")}?t=${Date.now()}`;
      return { url, key: input.key };
    },

    async delete(key: string): Promise<void> {
      try {
        await client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        );
      } catch (err) {
        console.warn("[storage:r2] delete failed", key, err);
      }
    },
  };
}
