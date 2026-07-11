import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import type { NotifyChannel, NotifyPayload, NotifyUser } from "./types";

let configured = false;

function ensureVapid() {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@todoplan.local";
  if (!publicKey || !privateKey) {
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export const webPushChannel: NotifyChannel = {
  id: "webpush",
  name: "浏览器推送",

  async send(user: NotifyUser, payload: NotifyPayload) {
    if (!ensureVapid()) return;

    const subs = await prisma.pushSubscription.findMany({
      where: { userId: user.id },
    });
    if (subs.length === 0) return;

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/dashboard",
    });

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            body
          );
        } catch (err: unknown) {
          const status =
            err && typeof err === "object" && "statusCode" in err
              ? (err as { statusCode?: number }).statusCode
              : undefined;
          // 订阅失效则清理
          if (status === 404 || status === 410) {
            await prisma.pushSubscription
              .delete({ where: { id: sub.id } })
              .catch(() => {});
          } else {
            console.error("[webpush] send error", err);
          }
        }
      })
    );
  },
};
