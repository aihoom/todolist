import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api";
import { getStorageDriverName } from "@/lib/storage";

/** 当前存储驱动状态（登录用户可读，便于排查） */
export async function GET() {
  try {
    await requireUser();
    const driver = getStorageDriverName();
    return jsonOk({
      driver,
      r2Configured:
        driver === "r2"
          ? Boolean(
              process.env.R2_ACCOUNT_ID &&
                process.env.R2_ACCESS_KEY_ID &&
                process.env.R2_SECRET_ACCESS_KEY &&
                process.env.R2_BUCKET &&
                process.env.R2_PUBLIC_URL
            )
          : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
