import { prisma } from "./prisma";

export type SiteSettingsDTO = {
  id: string;
  siteName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  loginTagline: string | null;
  platformCnameTarget: string | null;
  platformSubdomainRoot: string | null;
  registrationOpen: boolean;
  maintenanceMessage: string | null;
};

const DEFAULTS: SiteSettingsDTO = {
  id: "default",
  siteName: "TodoPlan",
  logoUrl: null,
  faviconUrl: null,
  loginTagline: "和重要的人一起规划日常",
  platformCnameTarget: process.env.PLATFORM_CNAME_TARGET || null,
  platformSubdomainRoot: process.env.PLATFORM_SUBDOMAIN_ROOT || null,
  registrationOpen: true,
  maintenanceMessage: null,
};

export async function getSiteSettings(): Promise<SiteSettingsDTO> {
  try {
    let row = await prisma.siteSettings.findUnique({
      where: { id: "default" },
    });
    if (!row) {
      row = await prisma.siteSettings.create({
        data: {
          id: "default",
          siteName: DEFAULTS.siteName,
          loginTagline: DEFAULTS.loginTagline,
          platformCnameTarget: DEFAULTS.platformCnameTarget,
          platformSubdomainRoot: DEFAULTS.platformSubdomainRoot,
        },
      });
    }
    return row;
  } catch (err) {
    // 构建期 / DB 未就绪时回退，避免 next build 失败
    console.warn("[site-settings] fallback defaults:", err);
    return { ...DEFAULTS };
  }
}
