import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { getSiteSettings } from "@/lib/site-settings";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const settings = await getSiteSettings();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <AuthForm
        mode="login"
        siteName={settings.siteName}
        tagline={settings.loginTagline}
      />
    </main>
  );
}
