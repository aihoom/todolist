/**
 * 用户自定义主题的基础消毒。
 * 主题仅注入当前登录用户自己的页面，仍做基础防护。
 */

const MAX_CSS = 20_000;
const MAX_HTML = 12_000;

/** 去掉 CSS 中较危险的片段 */
export function sanitizeUserCss(raw: string | null | undefined): string {
  if (!raw) return "";
  let css = raw.slice(0, MAX_CSS);
  // 禁止表达式与 JS 协议
  css = css.replace(/expression\s*\(/gi, "/* blocked */(");
  css = css.replace(/javascript\s*:/gi, "blocked:");
  css = css.replace(/-moz-binding\s*:/gi, "/* blocked */:");
  css = css.replace(/behavior\s*:/gi, "/* blocked */:");
  css = css.replace(/@import\b/gi, "/* @import blocked */");
  // 去掉 </style 以免提前闭合
  css = css.replace(/<\/style/gi, "<\\/style");
  return css.trim();
}

/** 去掉 HTML 中的脚本与内联事件 */
export function sanitizeUserHtml(raw: string | null | undefined): string {
  if (!raw) return "";
  let html = raw.slice(0, MAX_HTML);
  html = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<script[^>]*>/gi, "");
  html = html.replace(/<\/script>/gi, "");
  html = html.replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/javascript\s*:/gi, "blocked:");
  html = html.replace(/data\s*:\s*text\/html/gi, "blocked:");
  html = html.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "");
  html = html.replace(/<iframe[^>]*\/?>/gi, "");
  html = html.replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "");
  html = html.replace(/<embed[^>]*\/?>/gi, "");
  html = html.replace(/<link[^>]*\/?>/gi, "");
  html = html.replace(/<meta[^>]*\/?>/gi, "");
  html = html.replace(/<base[^>]*\/?>/gi, "");
  html = html.replace(/<form[\s\S]*?>[\s\S]*?<\/form>/gi, "");
  return html.trim();
}

/** 校验背景图 URL：允许站内路径或 http(s) */
export function sanitizeBackgroundUrl(
  raw: string | null | undefined
): string | null {
  if (raw === undefined) return undefined as unknown as null;
  if (raw === null || raw === "") return null;
  const url = raw.trim().slice(0, 500);
  if (url.startsWith("/uploads/") || url.startsWith("/")) {
    // 禁止路径穿越
    if (url.includes("..")) return null;
    return url;
  }
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return u.toString();
    }
  } catch {
    return null;
  }
  return null;
}

export function clampOverlay(n: number | null | undefined): number {
  if (n === null || n === undefined || Number.isNaN(n)) return 70;
  return Math.min(100, Math.max(0, Math.round(n)));
}
