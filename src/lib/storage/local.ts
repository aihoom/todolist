import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import type { PutObjectInput, PutObjectResult, StorageDriver } from "./types";

/**
 * 本地磁盘驱动（Docker volume / 传统 VPS）
 * 文件落在 public/uploads，由 Next 静态托管。
 */
export function createLocalStorage(): StorageDriver {
  const root = path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    "public",
    "uploads"
  );

  return {
    name: "local",

    async put(input: PutObjectInput): Promise<PutObjectResult> {
      const full = path.join(root, input.key);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, Buffer.from(input.body));
      // 静态路径 + cache bust
      const url = `/uploads/${input.key.replace(/\\/g, "/")}?t=${Date.now()}`;
      return { url, key: input.key };
    },

    async delete(key: string): Promise<void> {
      const full = path.join(root, key);
      try {
        await unlink(full);
      } catch {
        /* ignore missing */
      }
    },
  };
}
