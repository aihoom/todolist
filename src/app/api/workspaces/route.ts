import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateInviteCode, requireUser } from "@/lib/auth";
import { getUserWorkspaces } from "@/lib/workspace";
import { handleApiError, jsonOk } from "@/lib/api";
import { normalizeSlug, slugify, validateSlug } from "@/lib/slug";
import { ensureUniqueWorkspaceSlug } from "@/lib/domain";

export async function GET() {
  try {
    const user = await requireUser();
    const workspaces = await getUserWorkspaces(user.id);
    return jsonOk({ workspaces });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  name: z.string().trim().min(1, "请填写工作区名称").max(60, "名称太长了"),
  description: z
    .string()
    .trim()
    .max(200, "描述太长了")
    .optional()
    .or(z.literal("")),
  slug: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = createSchema.parse(await request.json());

    let inviteCode = generateInviteCode();
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.workspace.findUnique({
        where: { inviteCode },
      });
      if (!exists) break;
      inviteCode = generateInviteCode();
    }

    const baseSlug = body.slug
      ? normalizeSlug(body.slug)
      : slugify(body.name);
    const slugErr = validateSlug(baseSlug);
    if (slugErr && body.slug) {
      return handleApiError(new Error(slugErr));
    }
    const slug = await ensureUniqueWorkspaceSlug(user.id, baseSlug);

    const ownedCount = await prisma.workspace.count({
      where: { ownerId: user.id },
    });

    const workspace = await prisma.workspace.create({
      data: {
        name: body.name,
        description: body.description || null,
        slug,
        inviteCode,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "owner",
          },
        },
      },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        _count: { select: { todos: true } },
      },
    });

    // 第一个工作区自动设为默认落地
    if (ownedCount === 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { defaultWorkspaceId: workspace.id },
      });
    }

    return jsonOk({ workspace }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
