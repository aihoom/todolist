/** 浏览器端 Web Push 订阅工具 */

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("当前浏览器不支持 Service Worker");
  }
  return navigator.serviceWorker.register("/sw.js");
}

export async function enableWebPush(): Promise<void> {
  if (!("Notification" in window) || !("PushManager" in window)) {
    throw new Error("当前浏览器不支持推送通知");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("未授予通知权限");
  }

  const keyRes = await fetch("/api/push/vapid-public-key");
  const keyData = await keyRes.json();
  if (!keyData.configured || !keyData.publicKey) {
    throw new Error("服务端未配置 VAPID 密钥（见 .env 中的 VAPID_*）");
  }

  const reg = await registerServiceWorker();
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
    });
  }

  const json = sub.toJSON();
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
    }),
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "订阅失败");
    }
  });
}

export async function disableWebPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });
  await sub.unsubscribe();
}
