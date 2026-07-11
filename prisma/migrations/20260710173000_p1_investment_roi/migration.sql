-- Phase 1: per-deal, seller-entered investment inputs and finance-grade ROI
-- assumptions. All columns are nullable so existing analyses keep working with
-- investment simply absent (ROI outputs stay opt-in).
ALTER TABLE "Analysis" ADD COLUMN "investmentOneTimeCost" REAL;
ALTER TABLE "Analysis" ADD COLUMN "investmentAnnualRecurringCost" REAL;
ALTER TABLE "Analysis" ADD COLUMN "investmentChangeManagementCost" REAL;
ALTER TABLE "Analysis" ADD COLUMN "roiHorizonYears" INTEGER;
ALTER TABLE "Analysis" ADD COLUMN "roiDiscountRatePct" REAL;
ALTER TABLE "Analysis" ADD COLUMN "adoptionSchedulePctJson" TEXT;
