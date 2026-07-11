import { prisma } from "./prisma";
import { generateInviteCode } from "./auth";
import { normalizeDomain, validateDomain } from "./slug";
import dns from "dns/promises";

/** 全站查重：slug 是否已被占用 */
export async function isSlugTaken(
  slug: string,
  excludeWorkspaceId?: string
): Promise<boolean> {
  const exists = await prisma.workspace.findFirst({
    where: {
      slug,
      ...(excludeWorkspaceId ? { id: { not: excludeWorkspaceId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(exists);
}

/**
 * 自动生成可用 slug（创建工作区时用）。
 * 用户手动指定时不要用这个静默改名，应直接报占用。
 */
export async function ensureUniqueWorkspaceSlug(
  _ownerId: string,
  base: string,
  excludeId?: string
) {
  let slug = base;
  for (let i = 0; i < 20; i++) {
    if (!(await isSlugTaken(slug, excludeId))) return slug;
    slug = `${base}-${generateInviteCode().slice(0, 4).toLowerCase()}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function resolveDomainRecord(domainRaw: string) {
  const domain = normalizeDomain(domainRaw);
  return prisma.customDomain.findUnique({
    where: { domain },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          defaultWorkspaceId: true,
          status: true,
        },
      },
    },
  });
}

export async function resolveWorkspaceByHostAndPath(
  host: string,
  pathSlug: string | null
) {
  const domain = normalizeDomain(host.split(":")[0] ?? host);
  const record = await resolveDomainRecord(domain);
  if (!record || record.status !== "active") return null;
  if (record.user.status !== "active") return null;

  if (!pathSlug) {
    if (record.user.defaultWorkspaceId) {
      const ws = await prisma.workspace.findFirst({
        where: {
          id: record.user.defaultWorkspaceId,
          ownerId: record.user.id,
        },
      });
      if (ws) return { domain: record, workspace: ws };
    }
    const ws = await prisma.workspace.findFirst({
      where: { ownerId: record.user.id },
      orderBy: { createdAt: "asc" },
    });
    return ws
      ? { domain: record, workspace: ws }
      : { domain: record, workspace: null };
  }

  // slug 全站唯一，但仍须属于该域名账号
  const ws = await prisma.workspace.findFirst({
    where: { slug: pathSlug, ownerId: record.user.id },
  });
  return ws
    ? { domain: record, workspace: ws }
    : { domain: record, workspace: null };
}

/** 主站路径 /w/{slug}（slug 全站唯一） */
export async function resolveWorkspaceBySlug(slug: string) {
  // 使用 findFirst，避免旧 client 未识别 slug 唯一索引时报 WhereUnique 错误
  return prisma.workspace.findFirst({ where: { slug } });
}

export async function verifyCustomDomainDns(
  domain: string,
  verifyToken: string,
  cnameTarget: string | null
): Promise<{ ok: boolean; error?: string }> {
  const host = normalizeDomain(domain);

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DOMAIN_VERIFY_SKIP === "1"
  ) {
    return { ok: true };
  }

  try {
    const txtName = `_todoplan-verify.${host}`;
    try {
      const txts = await dns.resolveTxt(txtName);
      const flat = txts.map((parts) => parts.join(""));
      if (flat.some((t) => t.includes(verifyToken))) {
        return { ok: true };
      }
    } catch {
      /* continue */
    }

    if (cnameTarget) {
      const target = normalizeDomain(cnameTarget);
      try {
        const cnames = await dns.resolveCname(host);
        if (
          cnames.some(
            (c) =>
              normalizeDomain(c) === target ||
              normalizeDomain(c) === target + "." ||
              normalizeDomain(c).endsWith(target)
          )
        ) {
          return { ok: true };
        }
      } catch {
        /* no cname */
      }
    }

    return {
      ok: false,
      error: cnameTarget
        ? `未检测到 TXT(_todoplan-verify.${host}=${verifyToken}) 或 CNAME(→${cnameTarget})`
        : `未检测到 TXT 记录 _todoplan-verify.${host} = ${verifyToken}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "DNS 查询失败",
    };
  }
}

export function newVerifyToken() {
  return `tp_${generateInviteCode().toLowerCase()}${generateInviteCode().toLowerCase()}`;
}

export { normalizeDomain, validateDomain };
