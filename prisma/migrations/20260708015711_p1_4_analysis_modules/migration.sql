-- CreateTable
CREATE TABLE "AnalysisModule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "displayOrder" INTEGER NOT NULL,
    "narrativeMode" TEXT NOT NULL DEFAULT 'TEMPLATE',
    "customNarrative" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnalysisModule_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalysisModuleInput" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisModuleId" TEXT NOT NULL,
    "inputKey" TEXT NOT NULL,
    "numericValue" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnalysisModuleInput_analysisModuleId_fkey" FOREIGN KEY ("analysisModuleId") REFERENCES "AnalysisModule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AnalysisModule_analysisId_displayOrder_idx" ON "AnalysisModule"("analysisId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisModule_analysisId_moduleKey_key" ON "AnalysisModule"("analysisId", "moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisModuleInput_analysisModuleId_inputKey_key" ON "AnalysisModuleInput"("analysisModuleId", "inputKey");
