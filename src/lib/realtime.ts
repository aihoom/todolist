/**
 * 进程内实时事件总线（SSE 用）。
 * 单机部署可用；多实例需换 Redis 等外部 pub/sub。
 */

export type WorkspaceEvent =
  | { type: "todo.created"; todo: unknown }
  | { type: "todo.updated"; todo: unknown }
  | { type: "todo.deleted"; todoId: string }
  | { type: "group.created"; group: unknown }
  | { type: "group.updated"; group: unknown }
  | { type: "group.deleted"; groupId: string }
  | { type: "workspace.updated" }
  | { type: "ping" };

type Listener = (event: WorkspaceEvent) => void;

const channels = new Map<string, Set<Listener>>();

export function subscribeWorkspace(
  workspaceId: string,
  listener: Listener
): () => void {
  let set = channels.get(workspaceId);
  if (!set) {
    set = new Set();
    channels.set(workspaceId, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) channels.delete(workspaceId);
  };
}

export function publishWorkspace(workspaceId: string, event: WorkspaceEvent) {
  const set = channels.get(workspaceId);
  if (!set) return;
  for (const listener of set) {
    try {
      listener(event);
    } catch (err) {
      console.error("[realtime] listener error", err);
    }
  }
}
