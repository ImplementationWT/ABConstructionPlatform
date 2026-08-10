import { z } from "zod";
import { TRADES } from "@/lib/trades";

const attachmentSchema = z.object({
  url: z.string().min(1),
  name: z.string().min(1),
});

export const rfiRequestSchema = z.object({
  projectId: z.string().min(1, "Select a project"),
  projectName: z.string().min(1),
  subject: z.string().min(1, "Subject is required"),
  question: z.string().min(1, "Add your question"),
  trades: z.array(z.enum(TRADES)).min(1, "Select at least one trade"),
  attachments: z.array(attachmentSchema).default([]),
});

export type RfiRequestFormValues = z.input<typeof rfiRequestSchema>;
export type RfiRequestInput = z.output<typeof rfiRequestSchema>;
