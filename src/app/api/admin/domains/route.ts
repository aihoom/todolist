import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { handleApiError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const domains = await prisma.customDomain.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });
    return jsonOk({ domains });
  } catch (error) {
    return handleApiError(error);
  }
}
