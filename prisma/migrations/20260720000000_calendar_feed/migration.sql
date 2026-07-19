-- AlterTable
ALTER TABLE "User" ADD COLUMN     "calendarFeedToken" TEXT,
ADD COLUMN     "calendarIncludePersonal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "calendarWorkspaceIds" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "calendarIncludeCompleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_calendarFeedToken_key" ON "User"("calendarFeedToken");
