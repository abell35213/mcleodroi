-- Persist seller overlap review dispositions at the analysis level.
CREATE TABLE "AnalysisOverlapDisposition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "overlapGroupKey" TEXT NOT NULL,
    "disposition" TEXT NOT NULL,
    "acknowledgmentText" TEXT,
    "sourceFingerprint" TEXT NOT NULL,
    "excludedModuleKeysJson" TEXT,
    "reviewedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnalysisOverlapDisposition_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AnalysisOverlapDisposition_analysisId_overlapGroupKey_key" ON "AnalysisOverlapDisposition"("analysisId", "overlapGroupKey");
CREATE INDEX "AnalysisOverlapDisposition_analysisId_idx" ON "AnalysisOverlapDisposition"("analysisId");
