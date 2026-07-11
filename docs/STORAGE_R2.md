# 对象存储：本地磁盘 + Cloudflare R2 双模式

## 结论：可行

业务上传（头像 / 背景 / 品牌）已统一走 `src/lib/storage`：

| 驱动 | 环境 | 用途 |
|------|------|------|
| **local**（默认） | VPS / Docker / 家里机器 | 写 `public/uploads`，零配置 |
| **r2** | 任意 Node 部署 | Cloudflare R2，S3 兼容 API |
| **r2-binding**（骨架） | Cloudflare Workers | `createR2BindingStorage(env.BUCKET, url)` |

**同一套上传 API**，只改环境变量即可切换。

---

## 1. 常规部署（保持不变）

```bash
STORAGE_DRIVER=local   # 或不写，默认 local
```

文件仍在 `public/uploads/...`，Docker 可挂 volume 到 `/data/uploads`。

---

## 2. 启用 Cloudflare R2（Node 进程）

### 2.1 在 Cloudflare 控制台

1. **R2** → Create bucket（如 `todoplan`）  
2. 桶设置 **Public access** 或绑定自定义域名（推荐 `cdn.你的域名`）  
3. **Manage R2 API Tokens** → 创建 Token（Object Read & Write）  
4. 记下：Account ID、Access Key ID、Secret Access Key  

### 2.2 环境变量

```bash
STORAGE_DRIVER=r2
R2_ACCOUNT_ID=你的账号ID
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=todoplan
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
# 或 https://cdn.example.com
```

重启应用后，上传头像/背景/Logo 会直接进 R2，数据库里存的是 **完整 HTTPS URL**。

### 2.3 验证

```bash
# 登录后
curl -s -b cookies http://localhost:3000/api/storage/status
# {"driver":"r2","r2Configured":true}
```

---

## 3. 与「Cloudflare Workers 部署」的关系

```
现在（已支持）:
  Next on Node/VPS  ──S3 API──►  R2
  Next on Node      ──本地盘──►  public/uploads

未来 Workers:
  Workers ──R2 Binding──►  R2
  （使用 createR2BindingStorage，见 r2-binding.stub.ts）
```

- **数据库**：Neon Postgres（与 R2 正交）  
- **上传**：R2  
- **App**：先 Node 公测；再迁 OpenNext/Workers 时换 binding，业务路由不用重写  

---

## 4. 代码入口

| 文件 | 作用 |
|------|------|
| `src/lib/storage/index.ts` | `getStorage()` 工厂 |
| `src/lib/storage/local.ts` | 本地驱动 |
| `src/lib/storage/r2.ts` | R2 S3 API 驱动 |
| `src/lib/storage/r2-binding.stub.ts` | Workers Binding 骨架 |
| `api/profile/avatar` 等 | 只调 `getStorage().put()` |

---

## 5. 费用与注意

- R2 有免费额度（以 Cloudflare 官网为准），2 人公测通常远够用  
- `R2_PUBLIC_URL` 必须是浏览器能打开的地址  
- 从 local 切到 r2 **不会自动搬迁旧文件**；旧头像若仍是 `/uploads/...` 可继续用，新上传走 R2  
- 生产密钥不要进 git  
