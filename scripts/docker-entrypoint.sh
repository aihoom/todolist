#!/bin/sh
set -e

mkdir -p /data/uploads/avatars /data/uploads/backgrounds /data/uploads/branding
# 上传持久化：统一写 /data/uploads，由 /uploads/* 路由提供（不依赖 Next 启动时扫描 public/）
export UPLOAD_DIR="${UPLOAD_DIR:-/data/uploads}"
# 兼容旧静态路径 / 外部直接读 public/uploads 的部署
if [ -d /data/uploads ]; then
  rm -rf /app/public/uploads
  ln -sfn /data/uploads /app/public/uploads
fi

if [ -z "$DATABASE_URL" ]; then
  echo "[todoplan] ERROR: DATABASE_URL is required (PostgreSQL)"
  exit 1
fi

echo "[todoplan] applying migrations..."
npx prisma migrate deploy

if [ "${SEED_ADMIN:-0}" = "1" ]; then
  echo "[todoplan] seeding admin..."
  node scripts/seed-admin.mjs || true
fi

echo "[todoplan] starting..."
exec "$@"
