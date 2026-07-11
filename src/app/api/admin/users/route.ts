import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { handleApiError, jsonOk } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q } },
              { name: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            ownedWorkspaces: true,
            memberships: true,
            customDomains: true,
          },
        },
      },
    });

    return jsonOk({ users });
  } catch (error) {
    return handleApiError(error);
  }
}
