import type { UserTheme as Theme } from "@/lib/theme";
import { buildThemeCss } from "@/lib/theme";

/**
 * 注入当前登录用户自己的主题 CSS / 装饰 HTML。
 * body 的 has-user-theme class 由 layout 设置。
 */
export function UserThemeInject({ theme }: { theme: Theme | null }) {
  if (!theme) return null;

  const css = buildThemeCss(theme);
  const hasHtml = Boolean(theme.customHtml);

  if (!css && !hasHtml) return null;

  return (
    <>
      {css ? (
        <style
          id="user-theme-css"
          dangerouslySetInnerHTML={{ __html: css }}
        />
      ) : null}
      {hasHtml ? (
        <div
          id="user-custom-html"
          className="user-custom-html pointer-events-none fixed inset-0 z-0 overflow-hidden"
          aria-hidden
          dangerouslySetInnerHTML={{ __html: theme.customHtml }}
        />
      ) : null}
    </>
  );
}
