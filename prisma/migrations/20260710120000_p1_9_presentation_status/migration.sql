-- Move presentation generation rows from the snapshot-only status to the
-- production lifecycle and update the SQLite column default to PENDING.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_PresentationGeneration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "filePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PresentationGeneration_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_PresentationGeneration" ("id", "analysisId", "templateVersion", "snapshotJson", "filePath", "status", "generatedAt")
SELECT "id", "analysisId", "templateVersion", "snapshotJson", "filePath", CASE WHEN "status" = 'SNAPSHOT_CREATED' THEN 'PENDING' ELSE "status" END, "generatedAt"
FROM "PresentationGeneration";

DROP TABLE "PresentationGeneration";
ALTER TABLE "new_PresentationGeneration" RENAME TO "PresentationGeneration";
CREATE INDEX "PresentationGeneration_analysisId_generatedAt_idx" ON "PresentationGeneration"("analysisId", "generatedAt");

PRAGMA foreign_keys=ON;
