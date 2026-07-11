/**
 * 创建/更新管理员（PostgreSQL）
 * 用法: node scripts/seed-admin.mjs
 */
import "dotenv/config";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

const email = (process.env.ADMIN_EMAIL || "admin@todoplan.local").toLowerCase();
const password = process.env.ADMIN_PASSWORD || "admin123456";
const name = process.env.ADMIN_NAME || "管理员";
const url = process.env.DATABASE_URL;

if (!url || url.startsWith("file:")) {
  console.error("请设置 PostgreSQL DATABASE_URL，例如：");
  console.error(
    '  DATABASE_URL="postgresql://todoplan:todoplan@localhost:5432/todoplan"'
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const passwordHash = await bcrypt.hash(password, 10);
const now = new Date().toISOString();
const id = "c" + crypto.randomBytes(12).toString("hex");

const existing = await client.query(`SELECT id FROM "User" WHERE email = $1`, [
  email,
]);

if (existing.rows[0]) {
  await client.query(
    `UPDATE "User" SET "passwordHash" = $1, role = 'admin', status = 'active', name = $2, "updatedAt" = $3 WHERE email = $4`,
    [passwordHash, name, now, email]
  );
  console.log("Admin updated:", email, `(id=${existing.rows[0].id})`);
} else {
  await client.query(
    `INSERT INTO "User" (
      id, email, name, "passwordHash", role, status,
      "notifyOnTodoCreate", "notifyOnTodoComplete", "notifyOnDueSoon",
      "backgroundOverlay", "createdAt", "updatedAt"
    ) VALUES ($1,$2,$3,$4,'admin','active', true, true, true, 70, $5, $5)`,
    [id, email, name, passwordHash, now]
  );
  console.log("Admin created:", email, `(id=${id})`);
}

const settings = await client.query(
  `SELECT id FROM "SiteSettings" WHERE id = 'default'`
);
if (!settings.rows[0]) {
  await client.query(
    `INSERT INTO "SiteSettings" (
      id, "siteName", "loginTagline", "platformCnameTarget",
      "platformSubdomainRoot", "registrationOpen", "updatedAt"
    ) VALUES (
      'default', 'TodoPlan', '和重要的人一起规划日常', $1, $2, true, $3
    )`,
    [
      process.env.PLATFORM_CNAME_TARGET || null,
      process.env.PLATFORM_SUBDOMAIN_ROOT || null,
      now,
    ]
  );
  console.log("SiteSettings created");
}

console.log("Password:", password);
await client.end();
