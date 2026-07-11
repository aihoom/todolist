import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { getSiteSettings } from "@/lib/site-settings";

const schema = z.object({
  name: z.string().trim().min(1, "请填写昵称").max(40, "昵称太长了"),
  email: z.string().trim().email("邮箱格式不正确").toLowerCase(),
  password: z.string().min(6, "密码至少 6 位").max(72, "密码太长了"),
  inviteCode: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const settings = await getSiteSettings();
    if (!settings.registrationOpen) {
      return jsonError("当前暂停开放注册", 403);
    }

    // 可选邀请码：有则校验并计数，无也可注册
    let inviteId: string | null = null;
    if (body.inviteCode) {
      const invite = await prisma.inviteLink.findUnique({
        where: { code: body.inviteCode.toUpperCase() },
      });
      if (!invite || !invite.active) {
        return jsonError("邀请链接无效或已关闭", 400);
      }
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return jsonError("邀请链接已过期", 400);
      }
      if (invite.maxUses != null && invite.usedCount >= invite.maxUses) {
        return jsonError("邀请链接已达到使用次数上限", 400);
      }
      inviteId = invite.id;
    }

    const exists = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (exists) {
      return jsonError("该邮箱已注册", 409);
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
      },
      select: { id: true, email: true, name: true },
    });

    if (inviteId) {
      await prisma.inviteLink.update({
        where: { id: inviteId },
        data: { usedCount: { increment: 1 } },
      });
    }

    await createSession(user);
    return jsonOk({ user }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
