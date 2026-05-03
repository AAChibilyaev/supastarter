-- CreateEnum
CREATE TYPE "RoadmapItemStatus" AS ENUM ('shipped', 'inProgress', 'planned');

-- CreateTable
CREATE TABLE "roadmap_item" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RoadmapItemStatus" NOT NULL DEFAULT 'planned',
    "quarter" TEXT NOT NULL DEFAULT '',
    "iconName" TEXT NOT NULL DEFAULT '',
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "changelogSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmap_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_item_key_key" ON "roadmap_item"("key");
