import { readFile, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getUploadRoot } from "@/lib/storage/local";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 运行时提供上传文件。
 * Next.js production 不会把启动后写入 public/ 的新文件加入静态表，
 * 必须用 Route Handler 从磁盘读。
 */

const ALLOWED_TOP = new Set(["avatars", "backgrounds", "branding", "notes"]);

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await context.params;
  if (!segments?.length) {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (!ALLOWED_TOP.has(segments[0])) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // 禁止路径穿越与绝对路径片段
  if (
    segments.some(
      (s) => !s || s === "." || s === ".." || s.includes("\0") || s.includes("/")
    )
  ) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const root = path.resolve(getUploadRoot());
  const full = path.resolve(root, ...segments);
  if (full !== root && !full.startsWith(root + path.sep)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const info = await stat(full);
    if (!info.isFile()) {
      return new NextResponse("Not Found", { status: 404 });
    }
    const body = await readFile(full);
    const ext = path.extname(full).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(body.byteLength),
        // 文件名含用户 id；URL 带 ?t= 刷新缓存
        "Cache-Control": "public, max-age=86400, must-revalidate",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
