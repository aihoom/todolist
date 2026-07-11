const RESERVED = new Set([
  "api",
  "admin",
  "login",
  "register",
  "dashboard",
  "profile",
  "personal",
  "workspace",
  "workspaces",
  "settings",
  "site",
  "t",
  "w",
  "static",
  "uploads",
  "favicon.ico",
  "_next",
  "robots.txt",
  "sitemap.xml",
]);

/** 从名称生成 slug 候选 */
export function slugify(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  // 纯中文等没有 ascii 时用随机
  if (!s || !/[a-z0-9]/.test(s)) {
    return `ws-${randomSuffix(6)}`;
  }
  // 若含中文，保留中文但 URL 可能编码；为简单起见只保留 ascii
  const ascii = s.replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return ascii || `ws-${randomSuffix(6)}`;
}

export function randomSuffix(len = 4) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function normalizeSlug(raw: string): string {
  return slugify(raw);
}

export function validateSlug(slug: string): string | null {
  if (!slug || slug.length < 2) return "后缀至少 2 个字符";
  if (slug.length > 40) return "后缀太长";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return "仅支持小写字母、数字与短横线";
  }
  if (RESERVED.has(slug)) return "该后缀为系统保留字";
  return null;
}

export function isReservedSlug(slug: string) {
  return RESERVED.has(slug);
}

export function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

export function validateDomain(domain: string): string | null {
  if (!domain) return "请填写域名";
  if (domain.length > 200) return "域名过长";
  if (domain.includes("localhost") || domain.startsWith("127.")) {
    // 开发允许
  }
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain) && !domain.includes("localhost")) {
    return "域名格式不正确";
  }
  return null;
}
