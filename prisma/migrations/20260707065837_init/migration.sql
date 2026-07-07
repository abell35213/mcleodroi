-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "customerContact" TEXT,
    "businessType" TEXT NOT NULL,
    "preparedBy" TEXT NOT NULL,
    "analysisDate" DATETIME NOT NULL,
    "customerLogoPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
