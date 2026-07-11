import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold">页面不存在</h1>
      <p className="mt-2 text-muted">可能是链接有误，或你没有访问权限。</p>
      <Link
        href="/dashboard"
        className="mt-6 font-semibold text-primary hover:underline"
      >
        返回首页
      </Link>
    </main>
  );
}
