-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "isMergeNode" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MergeEdge" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "branchOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MergeEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MergeEdge_childId_idx" ON "MergeEdge"("childId");

-- CreateIndex
CREATE INDEX "MergeEdge_parentId_idx" ON "MergeEdge"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "MergeEdge_childId_parentId_key" ON "MergeEdge"("childId", "parentId");

-- AddForeignKey
ALTER TABLE "MergeEdge" ADD CONSTRAINT "MergeEdge_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MergeEdge" ADD CONSTRAINT "MergeEdge_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
