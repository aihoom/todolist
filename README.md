# TodoPlan · 共享计划工作区

网页版多人共享待办。支持注册登录、工作区邀请、截止日期、实时同步、浏览器推送与 Server酱 推送。

## 功能

- **账号 / 资料**：注册登录、改昵称、简介、头像、自定义域名
- **工作区**：创建、邀请码加入、全站唯一路径后缀 `/w/{slug}`
- **共享待办**：分组、截止日期、完成状态
- **实时同步**：工作区内 SSE
- **推送**：Server酱 + 浏览器 Web Push
- **日历同步**：可配置 ICS 订阅源 + 单条「加入日历」
- **手机桌面入口**：`/widget` 轻量页 + 添加到主屏幕（PWA）
- **运营后台**：用户 / 域名 / 品牌 / 邀请链接

## 技术栈

- Next.js (App Router) + TypeScript + Tailwind
- Prisma 7 + **PostgreSQL**
- JWT Cookie 会话
- SSE 实时同步 / web-push

## 本地运行

```bash
npm install
cp .env.example .env

# Postgres：本机 Docker
docker compose up -d db
# 或 Neon 免费库 → 把连接串写入 DATABASE_URL

npx prisma migrate deploy
npm run seed:admin
npm run dev
```

- 站点：http://localhost:3000  
- 后台：`/admin/login`（默认见 `.env` 中 ADMIN_*）

旧 SQLite 数据不会自动迁移；历史迁移在 `prisma/migrations_sqlite_archive/`。

## 文档

| 文档 | 内容 |
|------|------|
| [DEPLOY.md](./DEPLOY.md) | 省钱部署、Docker、Tunnel、Oracle |
| [docs/POSTGRES_AND_CLOUDFLARE.md](./docs/POSTGRES_AND_CLOUDFLARE.md) | Postgres 公测 + Cloudflare 路线 |
| [docs/STORAGE_R2.md](./docs/STORAGE_R2.md) | 本地磁盘 / Cloudflare R2 双模式上传 |

## 环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | **PostgreSQL** 连接串 |
| `AUTH_SECRET` | 会话签名密钥 |
| `APP_URL` / `APP_HOST` | 站点 URL 与 Host |
| `VAPID_*` | 浏览器 Web Push（可选） |

## Server酱

1. [sct.ftqq.com](https://sct.ftqq.com/) 拿 SendKey  
2. 个人资料里配置并测试  

## 生产注意

- 使用 Neon/Supabase 等托管 Postgres 做公测  
- 强 `AUTH_SECRET`、强管理员密码  
- Web Push 需 HTTPS  
- 上传文件后续建议迁 R2/S3  
- 多实例时 SSE 需 Redis；到期提醒建议 Cron  
