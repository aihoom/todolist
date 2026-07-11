import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { getSiteSettings } from "@/lib/site-settings";

type Props = { searchParams: Promise<{ invite?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const settings = await getSiteSettings();
  const sp = await searchParams;
  const inviteCode = sp.invite?.trim().toUpperCase();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <AuthForm
        mode="register"
        inviteCode={inviteCode}
        siteName={settings.siteName}
        tagline={settings.loginTagline}
      />
    </main>
  );
}
