import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { createAdminSession, writeAudit } from "@/lib/admin";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

const schema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || user.role !== "admin") {
      return jsonError("账号或密码错误", 401);
    }
    if (user.status !== "active") {
      return jsonError("管理员账号已禁用", 403);
    }
    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) return jsonError("账号或密码错误", 401);

    await createAdminSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    await writeAudit(user.id, "admin.login");
    return jsonOk({
      admin: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
