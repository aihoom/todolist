import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, writeAudit } from "@/lib/admin";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = schema.parse(await request.json());
    const invite = await prisma.inviteLink.update({
      where: { id },
      data: {
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
    });
    await writeAudit(admin.id, "invite.update", "invite", id, body);
    return jsonOk({ invite });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    await prisma.inviteLink.delete({ where: { id } });
    await writeAudit(admin.id, "invite.delete", "invite", id);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
