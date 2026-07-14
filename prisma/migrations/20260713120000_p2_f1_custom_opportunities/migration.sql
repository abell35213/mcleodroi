CREATE TABLE "CustomOpportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortTitle" TEXT,
    "categoryKey" TEXT NOT NULL,
    "valueClassification" TEXT NOT NULL,
    "valueFrequency" TEXT NOT NULL,
    "enteredValue" REAL NOT NULL,
    "monthlyRecurringValue" REAL,
    "annualRecurringValue" REAL,
    "annualOnlyValue" REAL,
    "informationalCapitalValue" REAL,
    "calculationRationale" TEXT NOT NULL,
    "howMcLeodHelps" TEXT,
    "customerBusinessImpact" TEXT,
    "presentationCallout" TEXT,
    "methodologyNote" TEXT,
    "sourceNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "sourceFingerprint" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomOpportunity_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "CustomOpportunityAssumption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customOpportunityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayValue" TEXT NOT NULL,
    "numericValue" REAL,
    "unit" TEXT,
    "sourceNote" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomOpportunityAssumption_customOpportunityId_fkey" FOREIGN KEY ("customOpportunityId") REFERENCES "CustomOpportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CustomOpportunity_analysisId_displayOrder_idx" ON "CustomOpportunity"("analysisId", "displayOrder");
CREATE INDEX "CustomOpportunityAssumption_customOpportunityId_displayOrder_idx" ON "CustomOpportunityAssumption"("customOpportunityId", "displayOrder");
