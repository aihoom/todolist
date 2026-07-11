import { prisma } from "./prisma";
import { getSessionUser } from "./auth";
import {
  clampOverlay,
  sanitizeUserCss,
  sanitizeUserHtml,
} from "./sanitize";

export type UserTheme = {
  backgroundImageUrl: string | null;
  backgroundOverlay: number;
  customCss: string;
  customHtml: string;
};

export async function getCurrentUserTheme(): Promise<UserTheme | null> {
  try {
    const session = await getSessionUser();
    if (!session) return null;

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        backgroundImageUrl: true,
        backgroundOverlay: true,
        customCss: true,
        customHtml: true,
      },
    });
    if (!user) return null;

    return {
      backgroundImageUrl: user.backgroundImageUrl,
      backgroundOverlay: clampOverlay(user.backgroundOverlay),
      customCss: sanitizeUserCss(user.customCss),
      customHtml: sanitizeUserHtml(user.customHtml),
    };
  } catch {
    return null;
  }
}

export function buildThemeCss(theme: UserTheme): string {
  const parts: string[] = [];

  if (theme.backgroundImageUrl) {
    const url = theme.backgroundImageUrl.replace(/"/g, '\\"');
    const overlay = theme.backgroundOverlay / 100;
    parts.push(`
body.has-user-theme {
  background-color: var(--background);
  background-image: url("${url}");
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  background-repeat: no-repeat;
}
body.has-user-theme::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: rgba(246, 244, 239, ${overlay});
}
/* 页面内容浮在背景遮罩之上；装饰 HTML 单独一层 */
body.has-user-theme > *:not(#user-custom-html):not(style) {
  position: relative;
  z-index: 1;
}
#user-custom-html {
  z-index: 0;
}
`);
  }

  if (theme.customCss) {
    parts.push(`\n/* user custom css */\n${theme.customCss}\n`);
  }

  return parts.join("\n");
}
