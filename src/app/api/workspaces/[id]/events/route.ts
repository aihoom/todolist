import { requireUser } from "@/lib/auth";
import { assertWorkspaceMember } from "@/lib/workspace";
import { subscribeWorkspace, type WorkspaceEvent } from "@/lib/realtime";
import { startDueReminderLoop } from "@/lib/notify";

startDueReminderLoop();

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id: workspaceId } = await params;
    await assertWorkspaceMember(workspaceId, user.id);

    const encoder = new TextEncoder();
    let cleanup: (() => void) | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let closed = false;

    const stream = new ReadableStream({
      start(controller) {
        const send = (event: WorkspaceEvent) => {
          if (closed) return;
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          } catch {
            // stream closed
          }
        };

        send({ type: "ping" });
        cleanup = subscribeWorkspace(workspaceId, send);

        heartbeat = setInterval(() => {
          send({ type: "ping" });
        }, 25000);

        request.signal.addEventListener("abort", () => {
          closed = true;
          if (heartbeat) clearInterval(heartbeat);
          cleanup?.();
          try {
            controller.close();
          } catch {
            /* ignore */
          }
        });
      },
      cancel() {
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        cleanup?.();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "无法建立实时连接";
    return new Response(JSON.stringify({ error: message }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}
