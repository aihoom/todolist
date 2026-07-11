import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getUserWorkspaces } from "@/lib/workspace";
import { countPersonalOpenTodos } from "@/lib/todos";
import { AppHeader } from "@/components/app-header";
import { DashboardClient } from "@/components/dashboard-client";
import type { WorkspaceSummary } from "@/lib/types";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [workspaces, personalOpenCount] = await Promise.all([
    getUserWorkspaces(user.id) as unknown as Promise<WorkspaceSummary[]>,
    countPersonalOpenTodos(user.id),
  ]);

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <DashboardClient
        initialWorkspaces={workspaces}
        personalOpenCount={personalOpenCount}
      />
    </div>
  );
}
