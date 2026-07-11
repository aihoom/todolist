import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api";
import { testServerChanKey } from "@/lib/notify/serverchan";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  /** 不传则用资料里已保存的 Key */
  sendKey: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await request.json().catch(() => ({})));

    let key = body.sendKey;
    if (!key) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { serverChanKey: true },
      });
      key = dbUser?.serverChanKey ?? "";
    }

    const result = await testServerChanKey(key || "");
    return jsonOk(result, result.ok ? 200 : 400);
  } catch (error) {
    return handleApiError(error);
  }
}
