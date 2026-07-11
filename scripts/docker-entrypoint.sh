#!/bin/sh
set -e

mkdir -p /data/uploads/avatars /data/uploads/backgrounds /data/uploads/branding
# 上传持久化（可选挂载 /data）
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
