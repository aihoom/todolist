import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

const schema = z.object({
  email: z.string().trim().email("邮箱格式不正确").toLowerCase(),
  password: z.string().min(1, "请填写密码"),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (!user) {
      return jsonError("邮箱或密码错误", 401);
    }
    if (user.status === "disabled") {
      return jsonError("账号已被禁用，请联系管理员", 403);
    }

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      return jsonError("邮箱或密码错误", 401);
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
    };
    await createSession(sessionUser);
    return jsonOk({ user: sessionUser });
  } catch (error) {
    return handleApiError(error);
  }
}
