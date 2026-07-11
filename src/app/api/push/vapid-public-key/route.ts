import { jsonOk } from "@/lib/api";
import { getVapidPublicKey } from "@/lib/notify/webpush";

export async function GET() {
  const publicKey = getVapidPublicKey();
  return jsonOk({
    publicKey,
    configured: Boolean(publicKey),
  });
}
