import type { Metadata } from "next";
import "./globals.css";
import { UserThemeInject } from "@/components/user-theme";
import { getCurrentUserTheme } from "@/lib/theme";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `${settings.siteName} · 共享计划工作区`,
    description:
      settings.loginTagline || "和伴侣、家人、朋友一起共享待办与工作计划",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: settings.siteName,
      statusBarStyle: "default",
    },
    icons: settings.faviconUrl
      ? [
          { url: settings.faviconUrl },
          { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        ]
      : [
          { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        ],
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [theme, settings] = await Promise.all([
    getCurrentUserTheme(),
    getSiteSettings(),
  ]);
  const hasCustomBg = Boolean(theme?.backgroundImageUrl);

  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body
        className={`min-h-full font-sans text-foreground${
          hasCustomBg ? " has-user-theme" : ""
        }`}
      >
        {settings.maintenanceMessage ? (
          <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
            {settings.maintenanceMessage}
          </div>
        ) : null}
        <UserThemeInject theme={theme} />
        {children}
      </body>
    </html>
  );
}
