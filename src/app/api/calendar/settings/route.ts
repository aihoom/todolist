import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api";
import {
  feedUrlForToken,
  parseCalendarWorkspaceIds,
  serializeCalendarWorkspaceIds,
} from "@/lib/calendar/feed-todos";

function newFeedToken() {
  return randomBytes(24).toString("base64url");
}

async function loadMembershipWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: { select: { id: true, name: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
  }));
}

export async function GET() {
  try {
    const session = await requireUser();
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: session.id },
      select: {
        calendarFeedToken: true,
        calendarIncludePersonal: true,
        calendarWorkspaceIds: true,
        calendarIncludeCompleted: true,
      },
    });
    const workspaces = await loadMembershipWorkspaces(session.id);
    const selectedIds = parseCalendarWorkspaceIds(user.calendarWorkspaceIds);
    const urls = user.calendarFeedToken
      ? feedUrlForToken(user.calendarFeedToken)
      : null;

    return jsonOk({
      enabled: Boolean(user.calendarFeedToken),
      includePersonal: user.calendarIncludePersonal,
      includeCompleted: user.calendarIncludeCompleted,
      workspaceIds: selectedIds,
      workspaces,
      httpsUrl: urls?.httpsUrl ?? null,
      webcalUrl: urls?.webcalUrl ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  enable: z.boolean().optional(),
  disable: z.boolean().optional(),
  regenerate: z.boolean().optional(),
  includePersonal: z.boolean().optional(),
  includeCompleted: z.boolean().optional(),
  workspaceIds: z.array(z.string()).optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await requireUser();
    const body = patchSchema.parse(await request.json());

    const current = await prisma.user.findUniqueOrThrow({
      where: { id: session.id },
      select: {
        calendarFeedToken: true,
        calendarIncludePersonal: true,
        calendarWorkspaceIds: true,
        calendarIncludeCompleted: true,
      },
    });

    const data: {
      calendarFeedToken?: string | null;
      calendarIncludePersonal?: boolean;
      calendarWorkspaceIds?: string;
      calendarIncludeCompleted?: boolean;
    } = {};

    if (body.disable) {
      data.calendarFeedToken = null;
    } else if (body.regenerate) {
      data.calendarFeedToken = newFeedToken();
    } else if (body.enable && !current.calendarFeedToken) {
      data.calendarFeedToken = newFeedToken();
    } else if (body.enable === true && current.calendarFeedToken) {
      // already enabled
    }

    if (body.includePersonal !== undefined) {
      data.calendarIncludePersonal = body.includePersonal;
    }
    if (body.includeCompleted !== undefined) {
      data.calendarIncludeCompleted = body.includeCompleted;
    }
    if (body.workspaceIds !== undefined) {
      const memberships = await prisma.workspaceMember.findMany({
        where: {
          userId: session.id,
          workspaceId: { in: body.workspaceIds },
        },
        select: { workspaceId: true },
      });
      const allowed = new Set(memberships.map((m) => m.workspaceId));
      data.calendarWorkspaceIds = serializeCalendarWorkspaceIds(
        body.workspaceIds.filter((id) => allowed.has(id))
      );
    }

    const user = await prisma.user.update({
      where: { id: session.id },
      data,
      select: {
        calendarFeedToken: true,
        calendarIncludePersonal: true,
        calendarWorkspaceIds: true,
        calendarIncludeCompleted: true,
      },
    });

    const workspaces = await loadMembershipWorkspaces(session.id);
    const urls = user.calendarFeedToken
      ? feedUrlForToken(user.calendarFeedToken)
      : null;

    return jsonOk({
      enabled: Boolean(user.calendarFeedToken),
      includePersonal: user.calendarIncludePersonal,
      includeCompleted: user.calendarIncludeCompleted,
      workspaceIds: parseCalendarWorkspaceIds(user.calendarWorkspaceIds),
      workspaces,
      httpsUrl: urls?.httpsUrl ?? null,
      webcalUrl: urls?.webcalUrl ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
