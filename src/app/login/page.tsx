import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { getSiteSettings } from "@/lib/site-settings";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

function safeNextPath(next?: string): string | undefined {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return undefined;
  return next;
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const user = await getSessionUser();
  if (user) redirect(next || "/dashboard");
  const settings = await getSiteSettings();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <AuthForm
        mode="login"
        siteName={settings.siteName}
        tagline={settings.loginTagline}
        nextPath={next}
      />
    </main>
  );
}
