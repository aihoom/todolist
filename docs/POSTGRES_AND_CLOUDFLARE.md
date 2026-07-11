# Postgres 公测 + Cloudflare 部署说明

## 1. 为什么改 Postgres

公测 / 产品化需要：

- 多用户并发写
- 托管备份（Neon / Supabase）
- 后续 Serverless 不依赖本地磁盘上的 SQLite 文件

**本仓库已从 SQLite 切换为 PostgreSQL。**

---

## 2. 本地开发（两条路）

### 路线 A：本机 Docker 只跑数据库

```bash
docker compose up -d db
# DATABASE_URL=postgresql://todoplan:todoplan@localhost:5432/todoplan
npx prisma migrate deploy
npm run seed:admin
npm run dev
```

### 路线 B：Neon 免费 Postgres（推荐公测）

1. 打开 [https://neon.tech](https://neon.tech) 注册，创建项目  
2. 复制连接串（带 `?sslmode=require`）  
3. 写入 `.env` 的 `DATABASE_URL`  
4. 

```bash
npx prisma migrate deploy
npm run seed:admin
npm run dev
```

旧的 SQLite `dev.db` **不会自动迁移**。公测前用新库即可；需要旧数据请自行导出/导入。

SQLite 历史迁移在 `prisma/migrations_sqlite_archive/` 仅作存档。

---

## 3. 与 Cloudflare 的关系（重要）

### 可以很好配合的部分

| 组件 | 建议 |
|------|------|
| **数据库** | Neon / Supabase Postgres（Cloudflare 可通过 Hyperdrive 连接） |
| **文件上传** | Cloudflare **R2**（下一步改造，目前仍写本机 `public/uploads`） |
| **CDN / HTTPS / 域名** | Cloudflare DNS + Proxy 或 Tunnel |
| **Cron 到期提醒** | Cloudflare Cron Triggers 调你的 API（替代进程内 setInterval） |

### 目前还不能「原样一键丢到 Workers」的部分

整站 Next.js App Router + Prisma + SSE + 本地上传 **完整迁到 Cloudflare Workers** 仍有坑：

- `pg` 驱动偏 Node；Workers 更稳妥是 **Neon serverless HTTP** 或 **Hyperdrive**
- SSE 长连接在 Workers 上受限
- 本地磁盘上传不可用 → 必须 R2
- OpenNext for Cloudflare 对复杂 App 支持要单独适配

**公测推荐架构（务实）：**

```
用户 → Cloudflare（DNS/CDN/WAF，免费）
         ↓
     小 VPS / 家里机器 / Oracle 免费机 跑 Next.js（Docker）
         ↓
     Neon Postgres（免费档够早期公测）
```

这样你得到：

- **产品化数据库（Postgres）**
- **Cloudflare 边缘与域名**
- **不必立刻重写为 Workers**

等公测验证后，再评估是否值得做 OpenNext + R2 + Neon serverless 全边缘化。

---

## 4. 公测上线最小清单

1. Neon 建库 + `migrate deploy`  
2. 一台能跑 Node 的机器（$0～2）+ Docker 或 `npm start`  
3. `AUTH_SECRET` / 管理员强密码  
4. Cloudflare 解析域名到机器（或 Tunnel）  
5. 关掉 `DOMAIN_VERIFY_SKIP`  
6. 每周备份 Neon（控制台支持）  

---

## 5. 后续改造优先级（Cloudflare 化）

1. ~~**上传改 R2**~~ → **已完成**（`STORAGE_DRIVER=local|r2`，见 [STORAGE_R2.md](./STORAGE_R2.md)）  
2. **到期提醒改 Cron HTTP**  
3. **SSE 改轮询或第三方 realtime**（若上 Workers）  
4. **OpenNext Cloudflare 适配**（配合 `createR2BindingStorage`）  

当前：Postgres + 可选 R2，适合公测；Workers 全站仍为后续步骤。
