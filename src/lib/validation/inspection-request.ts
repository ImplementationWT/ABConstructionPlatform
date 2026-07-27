import { z } from "zod";
import { TRADES } from "@/lib/trades";

export const inspectionRequestSchema = z
  .object({
    projectId: z.string().min(1, "Select a project"),
    projectName: z.string().min(1),
    trades: z.array(z.enum(TRADES)).min(1, "Select at least one trade"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    details: z.string().min(1, "Add inspection details"),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.endDate) < new Date(data.startDate)) {
      ctx.addIssue({
        code: "custom",
        message: "End date must be on or after the start date",
        path: ["endDate"],
      });
    }
  });

export type InspectionRequestFormValues = z.input<typeof inspectionRequestSchema>;
export type InspectionRequestInput = z.output<typeof inspectionRequestSchema>;
