import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import type { PutObjectInput, PutObjectResult, StorageDriver } from "./types";

/**
 * 本地上传根目录。
 *
 * 优先 UPLOAD_DIR（Docker 常挂 /data/uploads）；
 * 否则默认 public/uploads。
 *
 * 注意：Next.js 生产模式只在启动时扫描 public/ 静态文件表，
 * 运行时新写入的文件不会被静态托管识别。因此访问统一走
 * `src/app/uploads/[...path]/route.ts` 动态读取磁盘。
 */
export function getUploadRoot(): string {
  const fromEnv = process.env.UPLOAD_DIR?.trim();
  if (fromEnv) {
    return path.resolve(/*turbopackIgnore: true*/ fromEnv);
  }
  return path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    "public",
    "uploads"
  );
}

/**
 * 本地磁盘驱动（Docker volume / 传统 VPS）
 */
export function createLocalStorage(): StorageDriver {
  const root = getUploadRoot();

  return {
    name: "local",

    async put(input: PutObjectInput): Promise<PutObjectResult> {
      const full = path.join(root, input.key);
      // 防止 key 路径穿越
      const resolved = path.resolve(full);
      if (
        resolved !== path.resolve(root) &&
        !resolved.startsWith(path.resolve(root) + path.sep)
      ) {
        throw new Error("非法上传路径");
      }
      await mkdir(path.dirname(resolved), { recursive: true });
      await writeFile(resolved, Buffer.from(input.body));
      // 由 /uploads/... 路由提供；query 用于缓存刷新
      const url = `/uploads/${input.key.replace(/\\/g, "/")}?t=${Date.now()}`;
      return { url, key: input.key };
    },

    async delete(key: string): Promise<void> {
      const full = path.resolve(root, key);
      if (!full.startsWith(path.resolve(root) + path.sep)) return;
      try {
        await unlink(full);
      } catch {
        /* ignore missing */
      }
    },
  };
}
