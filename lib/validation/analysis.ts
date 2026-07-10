import { z } from "zod";

export const businessTypes = ["TRUCKLOAD", "BROKERAGE"] as const;
export type BusinessType = (typeof businessTypes)[number];

const requiredText = (fieldName: string) => z.string().trim().min(1, `${fieldName} is required`);

export const createAnalysisSchema = z.object({
  companyName: requiredText("Company name"),
  customerContact: z.string().trim().optional(),
  businessType: z.enum(businessTypes),
  preparedBy: requiredText("Prepared by"),
  analysisDate: z.coerce.date().refine((date) => !Number.isNaN(date.getTime()), "Analysis date must be valid"),
  customerLogoPath: z.string().trim().optional(),
});

export type CreateAnalysisInput = z.infer<typeof createAnalysisSchema>;

const optionalNonNegativeCurrency = (fieldName: string) =>
  z.coerce
    .number({ message: `${fieldName} must be a number` })
    .finite(`${fieldName} must be a valid number`)
    .min(0, `${fieldName} cannot be negative`)
    .optional();

/**
 * Seller-entered, per-deal investment inputs and ROI assumptions. Every field is
 * optional so ROI outputs stay opt-in; an analysis without a one-time cost keeps
 * showing identified opportunity exactly as before.
 */
export const analysisInvestmentSchema = z.object({
  investmentOneTimeCost: optionalNonNegativeCurrency("One-time implementation cost"),
  investmentAnnualRecurringCost: optionalNonNegativeCurrency("Recurring annual cost"),
  investmentChangeManagementCost: optionalNonNegativeCurrency("Change-management cost"),
  roiHorizonYears: z.coerce
    .number({ message: "Horizon must be a number" })
    .int("Horizon must be a whole number")
    .min(1, "Horizon must be at least 1 year")
    .max(10, "Horizon cannot exceed 10 years")
    .optional(),
  roiDiscountRatePct: z.coerce
    .number({ message: "Discount rate must be a number" })
    .min(0, "Discount rate cannot be negative")
    .max(1, "Discount rate must be a decimal between 0 and 1")
    .optional(),
  adoptionSchedulePct: z
    .array(
      z.coerce
        .number({ message: "Adoption percentage must be a number" })
        .min(0, "Adoption percentage cannot be negative")
        .max(1, "Adoption percentage must be a decimal between 0 and 1"),
    )
    .optional(),
});

export type AnalysisInvestmentInput = z.infer<typeof analysisInvestmentSchema>;
