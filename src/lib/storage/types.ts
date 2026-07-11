/**
 * 统一对象存储接口。
 * - local：常规部署，写 public/uploads（或 DATA_DIR）
 * - r2：Cloudflare R2（S3 兼容 API），Node 与未来 Workers 都可对接
 */

export type StorageDriverName = "local" | "r2";

export type PutObjectInput = {
  /** 对象键，如 avatars/xxx.jpg、backgrounds/yyy.png */
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  /** 缓存秒数，默认 1 年（带版本 query 时刷新） */
  cacheControl?: string;
};

export type PutObjectResult = {
  /** 浏览器可访问的 URL（本地为 /uploads/...，R2 为公网 URL） */
  url: string;
  key: string;
};

export interface StorageDriver {
  readonly name: StorageDriverName;
  put(input: PutObjectInput): Promise<PutObjectResult>;
  delete(key: string): Promise<void>;
}
