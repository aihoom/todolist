-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "serverChanKey" TEXT,
    "notifyOnTodoCreate" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnTodoComplete" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnDueSoon" BOOLEAN NOT NULL DEFAULT true,
    "backgroundImageUrl" TEXT,
    "backgroundOverlay" INTEGER NOT NULL DEFAULT 70,
    "customCss" TEXT,
    "customHtml" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatarUrl", "bio", "createdAt", "email", "id", "name", "notifyOnDueSoon", "notifyOnTodoComplete", "notifyOnTodoCreate", "passwordHash", "serverChanKey", "updatedAt") SELECT "avatarUrl", "bio", "createdAt", "email", "id", "name", "notifyOnDueSoon", "notifyOnTodoComplete", "notifyOnTodoCreate", "passwordHash", "serverChanKey", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
