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
