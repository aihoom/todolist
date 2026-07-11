import { redirect } from "next/navigation";

/** 旧入口：域名设置已并入个人资料 */
export default function SiteSettingsRedirectPage() {
  redirect("/profile");
}
