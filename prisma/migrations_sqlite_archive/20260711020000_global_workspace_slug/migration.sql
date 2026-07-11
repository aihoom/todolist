-- Drop old composite unique, make slug globally unique
DROP INDEX IF EXISTS "Workspace_ownerId_slug_key";
DROP INDEX IF EXISTS "Workspace_slug_idx";
-- Ensure no duplicates (suffix id if any collision - unlikely)
-- Create unique on slug
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
CREATE INDEX "Workspace_ownerId_idx" ON "Workspace"("ownerId");
