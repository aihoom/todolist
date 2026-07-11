import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";
import { AuthError } from "./auth";

const COOKIE = "todoplan_admin_session";
const DAYS = 7;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("缺少 AUTH_SECRET");
  return new TextEncoder().encode(s + ":admin");
}

export type AdminSession = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export async function createAdminSession(user: AdminSession) {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DAYS}d`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DAYS * 24 * 60 * 60,
  });
}

export async function destroyAdminSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const id = payload.sub;
    if (!id) return null;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, status: true },
    });
    if (!user || user.role !== "admin" || user.status !== "active") return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdminSession();
  if (!admin) throw new AuthError("请先登录管理后台", 401);
  return admin;
}

export async function writeAudit(
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  meta?: unknown
) {
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      targetType: targetType ?? null,
      targetId: targetId ?? null,
      meta: meta ? JSON.stringify(meta) : null,
    },
  });
}
