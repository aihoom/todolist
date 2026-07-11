import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPersonalTodos } from "@/lib/todos";
import { listPersonalGroups } from "@/lib/groups";
import { AppHeader } from "@/components/app-header";
import { PersonalClient } from "@/components/personal-client";
import type { TodoGroupItem, TodoItem } from "@/lib/types";

export default async function PersonalPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [todos, groups] = await Promise.all([
    getPersonalTodos(user.id),
    listPersonalGroups(user.id),
  ]);

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <PersonalClient
        initialTodos={todos as unknown as TodoItem[]}
        initialGroups={groups as unknown as TodoGroupItem[]}
      />
    </div>
  );
}
