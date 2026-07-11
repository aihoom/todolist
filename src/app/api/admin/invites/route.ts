import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/auth";
import { requireAdmin, writeAudit } from "@/lib/admin";
import { handleApiError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const invites = await prisma.inviteLink.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return jsonOk({ invites });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  note: z.string().trim().max(200).optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  expiresInDays: z.number().int().positive().max(365).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = createSchema.parse(await request.json().catch(() => ({})));
    let code = generateInviteCode();
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.inviteLink.findUnique({ where: { code } });
      if (!exists) break;
      code = generateInviteCode();
    }

    const expiresAt =
      body.expiresInDays != null
        ? new Date(Date.now() + body.expiresInDays * 86400000)
        : null;

    const invite = await prisma.inviteLink.create({
      data: {
        code,
        note: body.note || null,
        maxUses: body.maxUses ?? null,
        expiresAt,
        createdById: admin.id,
      },
    });
    await writeAudit(admin.id, "invite.create", "invite", invite.id);
    return jsonOk({ invite }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
