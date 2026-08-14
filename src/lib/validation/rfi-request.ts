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
  assignedPersonId: z.string().optional(),
  assignedPersonName: z.string().optional(),
  assignedPersonEmail: z.string().optional(),
  attachments: z.array(attachmentSchema).default([]),
});

export type RfiRequestFormValues = z.input<typeof rfiRequestSchema>;
export type RfiRequestInput = z.output<typeof rfiRequestSchema>;

export const rfiUpdateReplySchema = z
  .object({
    message: z.string().trim().max(4000, "Message is too long").default(""),
    attachments: z
      .array(attachmentSchema)
      .max(5, "You can attach up to 5 files")
      .default([]),
  })
  .refine((data) => data.message.length > 0 || data.attachments.length > 0, {
    message: "Write a message or attach a file",
    path: ["message"],
  });

export type RfiUpdateReplyInput = z.output<typeof rfiUpdateReplySchema>;
