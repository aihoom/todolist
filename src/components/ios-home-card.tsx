"use client";

import Link from "next/link";
import { Button, Card } from "./ui";

export function IosHomeCard() {
  return (
    <Card className="mb-6 p-5">
      <h2 className="mb-1 text-base font-semibold">手机桌面入口</h2>
      <p className="mb-3 text-sm text-muted">
        把轻量待办页「添加到主屏幕」，从桌面图标一键打开查看与勾选待办。
        这是 Web 应用快捷方式，不是 iOS 系统自带的 WidgetKit 小组件。
      </p>
      <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-sm text-muted">
        <li>
          用 <strong className="text-stone-800">Safari</strong>{" "}
          打开本站并登录
        </li>
        <li>
          打开{" "}
          <Link href="/widget" className="font-medium text-primary hover:underline">
            轻量待办页
          </Link>
        </li>
        <li>点底部分享按钮 →「添加到主屏幕」→ 添加</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <Link href="/widget">
          <Button type="button" className="text-sm">
            打开轻量待办页
          </Button>
        </Link>
      </div>
      <p className="mt-3 text-xs text-muted">
        Android Chrome 也可「添加到主屏幕」；需先登录，独立图标会沿用浏览器登录状态。
      </p>
    </Card>
  );
}
