import { z } from "zod";

export const projectLinkSchema = z.object({
  tradeFormUrl: z
    .string()
    .trim()
    .refine((value) => value === "" || /^https?:\/\/.+/.test(value), {
      message: "Enter a valid URL (starting with http:// or https://) or leave it empty",
    }),
});

export type ProjectLinkInput = z.infer<typeof projectLinkSchema>;
