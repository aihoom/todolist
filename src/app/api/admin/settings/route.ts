import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, writeAudit } from "@/lib/admin";
import { handleApiError, jsonOk } from "@/lib/api";
import { getSiteSettings } from "@/lib/site-settings";

export async function GET() {
  try {
    await requireAdmin();
    const settings = await getSiteSettings();
    return jsonOk({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}

const schema = z.object({
  siteName: z.string().trim().min(1).max(60).optional(),
  logoUrl: z.string().trim().max(500).nullable().optional(),
  faviconUrl: z.string().trim().max(500).nullable().optional(),
  loginTagline: z.string().trim().max(200).nullable().optional(),
  platformCnameTarget: z.string().trim().max(200).nullable().optional(),
  platformSubdomainRoot: z.string().trim().max(200).nullable().optional(),
  registrationOpen: z.boolean().optional(),
  maintenanceMessage: z.string().trim().max(500).nullable().optional(),
});

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.parse(await request.json());
    await getSiteSettings(); // ensure exists
    const settings = await prisma.siteSettings.update({
      where: { id: "default" },
      data: {
        ...(body.siteName !== undefined ? { siteName: body.siteName } : {}),
        ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl || null } : {}),
        ...(body.faviconUrl !== undefined
          ? { faviconUrl: body.faviconUrl || null }
          : {}),
        ...(body.loginTagline !== undefined
          ? { loginTagline: body.loginTagline || null }
          : {}),
        ...(body.platformCnameTarget !== undefined
          ? { platformCnameTarget: body.platformCnameTarget || null }
          : {}),
        ...(body.platformSubdomainRoot !== undefined
          ? { platformSubdomainRoot: body.platformSubdomainRoot || null }
          : {}),
        ...(body.registrationOpen !== undefined
          ? { registrationOpen: body.registrationOpen }
          : {}),
        ...(body.maintenanceMessage !== undefined
          ? { maintenanceMessage: body.maintenanceMessage || null }
          : {}),
      },
    });
    await writeAudit(admin.id, "settings.update", "settings", "default", body);
    return jsonOk({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}
