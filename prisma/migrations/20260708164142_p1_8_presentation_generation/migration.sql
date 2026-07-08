-- CreateTable
CREATE TABLE "PresentationGeneration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "filePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SNAPSHOT_CREATED',
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PresentationGeneration_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PresentationGeneration_analysisId_generatedAt_idx" ON "PresentationGeneration"("analysisId", "generatedAt");
