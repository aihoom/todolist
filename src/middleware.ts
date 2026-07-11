import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 自定义域名骨架：
 * 非主站 Host 的请求 rewrite 到 /t/{host}/...
 * 由服务端用 Prisma 解析域名与工作区 slug。
 */
export function middleware(request: NextRequest) {
  const hostHeader = request.headers.get("host") || "";
  const host = hostHeader.split(":")[0].toLowerCase();
  const appHost = (
    process.env.APP_HOST ||
    process.env.APP_URL?.replace(/^https?:\/\//, "").split("/")[0] ||
    "localhost"
  )
    .split(":")[0]
    .toLowerCase();

  // 主站或已进入 /t/ 映射路径，不处理
  if (
    !host ||
    host === appHost ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".localhost") ||
    request.nextUrl.pathname.startsWith("/t/") ||
    request.nextUrl.pathname.startsWith("/api/") ||
    request.nextUrl.pathname.startsWith("/_next/") ||
    // 用户上传资源由 app/uploads 路由提供，勿 rewrite 到自定义域名映射
    request.nextUrl.pathname.startsWith("/uploads")
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const rest = url.pathname === "/" ? "" : url.pathname;
  url.pathname = `/t/${encodeURIComponent(host)}${rest}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
