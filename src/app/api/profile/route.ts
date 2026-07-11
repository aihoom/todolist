import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { profileSelect, toProfileUser } from "@/lib/profile";
import {
  clampOverlay,
  sanitizeBackgroundUrl,
  sanitizeUserCss,
  sanitizeUserHtml,
} from "@/lib/sanitize";

export async function GET() {
  try {
    const session = await requireUser();
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: session.id },
      select: profileSelect,
    });
    return jsonOk({ user: toProfileUser(user) });
  } catch (error) {
    return handleApiError(error);
  }
}

const updateSchema = z.object({
  name: z.string().trim().min(1, "请填写昵称").max(40).optional(),
  bio: z.string().trim().max(300, "简介太长了").nullable().optional(),
  serverChanKey: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional()
    .or(z.literal("")),
  notifyOnTodoCreate: z.boolean().optional(),
  notifyOnTodoComplete: z.boolean().optional(),
  notifyOnDueSoon: z.boolean().optional(),
  backgroundImageUrl: z.string().max(500).nullable().optional(),
  backgroundOverlay: z.number().int().min(0).max(100).optional(),
  customCss: z.string().max(20000).nullable().optional(),
  customHtml: z.string().max(12000).nullable().optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await requireUser();
    const body = updateSchema.parse(await request.json());

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.bio !== undefined) data.bio = body.bio || null;
    if (body.serverChanKey !== undefined) {
      data.serverChanKey = body.serverChanKey || null;
    }
    if (body.notifyOnTodoCreate !== undefined) {
      data.notifyOnTodoCreate = body.notifyOnTodoCreate;
    }
    if (body.notifyOnTodoComplete !== undefined) {
      data.notifyOnTodoComplete = body.notifyOnTodoComplete;
    }
    if (body.notifyOnDueSoon !== undefined) {
      data.notifyOnDueSoon = body.notifyOnDueSoon;
    }
    if (body.backgroundImageUrl !== undefined) {
      if (body.backgroundImageUrl === null || body.backgroundImageUrl === "") {
        data.backgroundImageUrl = null;
      } else {
        const url = sanitizeBackgroundUrl(body.backgroundImageUrl);
        if (url === null && body.backgroundImageUrl.trim()) {
          return jsonError(
            "背景图地址无效，请使用站内上传路径或 http(s) 链接",
            400
          );
        }
        data.backgroundImageUrl = url;
      }
    }
    if (body.backgroundOverlay !== undefined) {
      data.backgroundOverlay = clampOverlay(body.backgroundOverlay);
    }
    if (body.customCss !== undefined) {
      data.customCss = body.customCss
        ? sanitizeUserCss(body.customCss) || null
        : null;
    }
    if (body.customHtml !== undefined) {
      data.customHtml = body.customHtml
        ? sanitizeUserHtml(body.customHtml) || null
        : null;
    }

    const user = await prisma.user.update({
      where: { id: session.id },
      data,
      select: profileSelect,
    });

    return jsonOk({ user: toProfileUser(user) });
  } catch (error) {
    return handleApiError(error);
  }
}
