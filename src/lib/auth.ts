import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const COOKIE_NAME = "todoplan_session";
const SESSION_DAYS = 30;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("缺少 AUTH_SECRET 环境变量");
  }
  return new TextEncoder().encode(secret);
}

/**
 * 会话 Cookie 是否加 Secure。
 * 不能仅靠 NODE_ENV===production：VPS 上用 http://IP:3000 访问时，
 * Secure cookie 会被浏览器直接丢弃，表现为「登录成功却仍停在登录页」。
 *
 * 优先级：COOKIE_SECURE 显式覆盖 → APP_URL 协议 → 默认 false（兼容 HTTP）
 */
export function sessionCookieSecure(): boolean {
  const explicit = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (explicit === "1" || explicit === "true" || explicit === "yes") {
    return true;
  }
  if (explicit === "0" || explicit === "false" || explicit === "no") {
    return false;
  }
  const appUrl = process.env.APP_URL ?? "";
  if (appUrl.startsWith("https://")) return true;
  if (appUrl.startsWith("http://")) return false;
  return false;
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  role?: string;
  defaultWorkspaceId?: string | null;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: {
  id: string;
  email: string;
  name: string;
}) {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: sessionCookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());
    const id = payload.sub;
    if (!id || typeof id !== "string") return null;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        bio: true,
        status: true,
        role: true,
        defaultWorkspaceId: true,
      },
    });
    if (!user || user.status !== "active") return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      defaultWorkspaceId: user.defaultWorkspaceId,
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError("请先登录");
  }
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
