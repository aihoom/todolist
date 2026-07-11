# TodoPlan 低成本部署指南（2–3 人小团队）

> 目标：尽量 **0 元或接近 0 元** 跑起来，稳定给公测 / 小团队用。  
> 技术特点：Next.js 全栈 + **PostgreSQL** + 上传文件 + SSE 实时同步。  
> 数据库迁移与 Cloudflare 说明见 **[docs/POSTGRES_AND_CLOUDFLARE.md](./docs/POSTGRES_AND_CLOUDFLARE.md)**。

---

## 0. 先看清：什么平台「不适合」本项目

数据库已迁 **Postgres**。公测推荐：

- **Neon / Supabase** 托管 Postgres（有免费档）
- **App** 仍建议先跑在常驻 Node（小 VPS / 家里 + Tunnel）
- Cloudflare 先做 **DNS/CDN/WAF/Tunnel**，全站 Workers 需后续改造（见 `docs/POSTGRES_AND_CLOUDFLARE.md`）

| 平台 | 是否合适 |
|------|----------|
| **Neon + 小机器跑 Next** | ✅ 公测首选 |
| **Cloudflare Tunnel + 自建** | ✅ 省钱 HTTPS |
| **Cloudflare Workers 直接跑全站** | ⚠️ 需再改造（R2、Neon serverless、SSE） |
| **Vercel 免费档原样部署** | ⚠️ 要托管 Postgres + Blob；SSE/上传仍要改 |

你们至少需要：**Postgres 连接串 + 一台能跑 Node 的进程**。

---

## 1. 平台推荐（能白嫖优先）

> **预算 ≤ $2/月、2 人使用**：优先 **$0 方案**，再考虑年付折合约 $1–2 的小 VPS。  
> **Fly.io 已基本没免费额度**，本项目也不再推荐它。

### 按月成本对照（2026 大致情况，下单前以官网为准）

| 方案 | 约月费 | 稳不稳 | 备注 |
|------|--------|--------|------|
| 家里设备 + Cloudflare Tunnel | **$0** | 看家里网络 | 最推荐省钱 |
| Oracle Cloud Always Free | **$0** | 云上 7×24 | 要信用卡验证；新账号 ARM 约 2 核/12GB 仍远超需求 |
| LowEndBox / RackNerd 年付促销 | **≈$1–2** | 一般够用 | 年付摊薄；看清是否续费暴涨 |
| IONOS 等入门 VPS | **≈$2 起** | 看机房 | 有时首年便宜、次年贵 |
| 国内学生机 / 轻量 | **几元～几十** | 国内访问好 | 常超 $2，但省心 |
| Vercel / 纯 Serverless | 看似免费 | ❌ 不适合 | SQLite + 原生模块 + 上传盘 |

---

### ⭐⭐⭐⭐⭐ 方案 A：家里闲置电脑 / NAS + Cloudflare Tunnel（真·白嫖）

- **费用**：0 元（电费另算）
- **要求**：有一台能常开的电脑、树莓派、NAS、旧笔记本
- **优点**：完全免费公网 HTTPS；不暴露家宽端口
- **缺点**：家里断电/断网就访问不了

适合：先自用、极致省钱。**两人日常待办完全够。**

### ⭐⭐⭐⭐⭐ 方案 B：Oracle Cloud Always Free（免费云主机）

- **费用**：0 元（Always Free，仍提供）
- **配置（约 2026）**：新免费账号 ARM 常见上限约 **2 OCPU + 12GB 内存**（仍远超 TodoPlan）；另有小规格 AMD 免费实例
- **优点**：云上 7×24；2 人用很宽裕
- **缺点**：注册要信用卡；部分地区额度紧张、开不出机器要多试区域；要自己维护系统

适合：愿意花时间注册、长期 $0 上云。  
**防坑**：只开 Always Free 规格，避免误开付费资源；设预算告警为 $0。

### ⭐⭐⭐⭐ 方案 C：年付「白菜」VPS（约 $1–2/月）

- 逛 [LowEndBox](https://lowendbox.com/) 的 **$1 VPS / 年付** 促销
- 常见品牌（时常有促销，非永久价）：**RackNerd** 等，年付摊下来可能 **≈$1.25–2/月**
- **优点**：独立公网 IP，比白嫖云省心一点
- **缺点**：机房多在美国；续费可能涨；小厂要自担跑路风险 → **务必做备份**

适合：Oracle 注册失败，又没有常开家里机器。

### ⭐⭐⭐ 方案 D：学生机 / 国内轻量（可能略超 $2）

- 腾讯云 / 阿里云 / 华为云「学生机」「新用户轻量」
- 国内访问好；价格常 **¥9–24/月**，可能超过 $2，但比折腾国际免费机省时间

### ❌ 不推荐（在你这个预算 + 技术栈下）

| 平台 | 原因 |
|------|------|
| **Fly.io** | 免费额度已基本没了 |
| **Vercel 免费档** | 无持久盘，SQLite/`better-sqlite3` 不合适 |
| **Render / Railway 免费试用** | 易休眠、额度紧，不适合当日常系统 |

---

## 2. 小团队资源需求（心里有数）

| 资源 | 建议 |
|------|------|
| CPU | 1 核足够 |
| 内存 | 512MB–1GB 可跑；1GB 更稳 |
| 磁盘 | 1–5GB（上传文件；库在 Neon 可几乎不占盘） |
| 带宽 | 家宽或 1Mbps 起步都够 2–3 人 |

---

## 3. 通用生产检查清单

部署前准备这些环境变量（见 `.env.production.example`）：

```bash
AUTH_SECRET=         # openssl rand -base64 32
APP_URL=https://xxx  # 最终访问地址
APP_HOST=xxx         # 不含 https://
ADMIN_EMAIL=
ADMIN_PASSWORD=      # 强密码
VAPID_*              # 可选：浏览器推送
```

**安全：**

1. 改掉默认管理员密码  
2. 生产 **不要** 设置 `DOMAIN_VERIFY_SKIP=1`  
3. 用 HTTPS（Tunnel / Caddy / Nginx 均可）  
4. 定期备份 `/data`（数据库 + 上传文件）

---

## 4. 推荐路线一：Docker Compose（任意 VPS / 家里机器）

### 4.1 安装 Docker

Ubuntu 示例：

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 重新登录后生效
```

### 4.2 上传代码

```bash
git clone <你的仓库> todoplan
cd todoplan
```

或本机打包 scp 上去。

### 4.3 配置环境

```bash
# 本地可先起数据库
docker compose up -d db

cp .env.production.example .env.production
nano .env.production
```

最少改：

- `DATABASE_URL`（本地 Compose 或 Neon 连接串）
- `AUTH_SECRET`
- `APP_URL` / `APP_HOST`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`

生成密钥：

```bash
openssl rand -base64 32
npx web-push generate-vapid-keys   # 可选
```

### 4.4 启动

```bash
docker compose up -d --build
docker compose logs -f
```

浏览器打开：`http://服务器IP:3000`  
管理后台：`/admin/login`

- **数据库**：在 Neon 控制台备份，或 `pg_dump`
- **上传图**：若用 Compose 挂了 `/data/uploads`，一并备份该目录

### 4.5 备份

```bash
# Postgres 逻辑备份示例
pg_dump "$DATABASE_URL" -Fc -f todoplan-$(date +%F).dump
```

建议每周备份一次。

---

## 5. 推荐路线二：Cloudflare Tunnel 免费 HTTPS（配合方案 A/B）

服务跑在 `localhost:3000` 后：

### 5.1 注册 Cloudflare，域名接入（可买便宜域名，或用朋友域名）

### 5.2 安装 cloudflared

```bash
# 以 Debian/Ubuntu 为例，参见官网安装包
cloudflared tunnel login
cloudflared tunnel create todoplan
cloudflared tunnel route dns todoplan 你的域名
```

配置 `~/.cloudflared/config.yml` 示例：

```yaml
tunnel: <tunnel-id>
credentials-file: /home/你的用户/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: plan.example.com
    service: http://127.0.0.1:3000
  - service: http_status:404
```

```bash
cloudflared tunnel run todoplan
# 或安装为 systemd 服务长期运行
```

`.env.production`：

```bash
APP_URL=https://plan.example.com
APP_HOST=plan.example.com
```

重启容器后即可用 HTTPS 访问，**无需公网 IP、无需路由器开端口**。

---

## 6. 推荐路线三：Oracle Cloud 免费机（从 0 到可用）

1. 打开 [Oracle Cloud](https://www.oracle.com/cloud/free/) 注册 Always Free  
2. 创建 **Ampere A1** 或免费 AMD 实例（选 Ubuntu 22.04）  
3. 安全组放行 **22**（SSH）；HTTP 可只给 Tunnel 用，不必对公网开 3000  
4. SSH 登录后执行：

```bash
sudo apt update && sudo apt install -y git
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
```

5. 按 **第 4 节** Docker 部署  
6. 再按 **第 5 节** 上 Cloudflare Tunnel  

这样：**服务器免费 + HTTPS 免费**。

---

## 7. 不用 Docker：裸机 Node（极简）

```bash
# 需要 Node 20+
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs build-essential

git clone <仓库> && cd todoplan
cp .env.production.example .env
# 编辑 .env，并把 DATABASE_URL 设到持久路径，例如：
# DATABASE_URL="file:/var/lib/todoplan/todoplan.db"

mkdir -p /var/lib/todoplan /var/lib/todoplan/uploads
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
SEED_ADMIN=1 npm run seed:admin

# 用 pm2 常驻
sudo npm i -g pm2
pm2 start npm --name todoplan -- start
pm2 save
pm2 startup
```

注意：上传目录默认在 `public/uploads`，生产建议迁到持久路径或继续用 Docker 的 `/data/uploads` 方案。

---

## 8. 自定义域名（2–3 人可选）

1. 在后台 **系统设置** 填 `PLATFORM_CNAME_TARGET`（若用 Tunnel，可填 Cloudflare 代理目标说明）  
2. 用户在 **个人资料** 绑定域名并验证  
3. 开发才用 `DOMAIN_VERIFY_SKIP=1`；生产关掉  

主站短链始终可用：`https://你的主站/w/后缀`，**不绑自定义域名也能用**。

---

## 9. 我怎么选？（决策树）

```
有常开的闲置电脑/NAS？
  ├─ 是 → Docker + Cloudflare Tunnel（最省钱）
  └─ 否 → 能接受注册 Oracle？
        ├─ 是 → Oracle 免费机 + Docker + Tunnel
        └─ 否 → 学生机/轻量云（几十元内）+ Docker
```

**不要**为了「省事」硬上 Vercel：以当前架构会踩持久化与原生模块坑，反而浪费时间。

---

## 10. 上线后 5 分钟验收

1. 打开 `APP_URL` 能注册/登录  
2. `/admin/login` 能进后台  
3. 创建工作区、设后缀，访问 `/w/你的后缀`  
4. 两人同工作区能互相看到待办  
5. 备份过一次 `/data`

---

## 11. 常见问题

**Q: 内存只有 512MB 能跑吗？**  
A: 可以。构建建议在本地/CI 做好镜像再上传；或在机器上 `NODE_OPTIONS=--max-old-space-size=400`。

**Q: 数据库坏了怎么办？**  
A: 用 `pg_dump` / Neon 恢复点恢复；上传目录单独备份。

**Q: 旧 SQLite 数据呢？**  
A: 不会自动迁移。公测建议空库开始；需要旧数据可联系开发写一次性导入脚本。

**Q: 国内访问国外免费机慢？**  
A: 优先家里机器 + Tunnel，或国内轻量云；Oracle/Fly 对国内延迟看地区。

---

## 12. 相关文件

| 文件 | 作用 |
|------|------|
| `Dockerfile` | 生产镜像 |
| `docker-compose.yml` | 一键启动 |
| `.env.production.example` | 生产环境变量模板 |
| `scripts/docker-entrypoint.sh` | 迁移 + 可选 seed + 启动 |
| `npm run seed:admin` | 创建管理员 |

有问题优先看容器日志：

```bash
docker compose logs -f todoplan
```
