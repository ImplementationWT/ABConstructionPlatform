import { z } from "zod";
import { TRADES } from "@/lib/trades";

export const WEATHER_CONDITIONS = [
  "fair",
  "severe_heat",
  "severe_rain",
  "severe_wind",
  "extreme_weather",
] as const;

// These labels are sent verbatim to Monday's "Weather Condition" dropdown column,
// so they must match its labels exactly.
export const WEATHER_LABELS: Record<(typeof WEATHER_CONDITIONS)[number], string> = {
  fair: "Fair Conditions",
  severe_heat: "Severe Heat",
  severe_rain: "Severe Rain",
  severe_wind: "Severe Wind",
  extreme_weather: "Extreme Weather",
};

export const photoSchema = z.object({
  url: z.string().min(1, "Photo is empty"),
  name: z.string().min(1),
});

export const tradeEntrySchema = z.object({
  tradeName: z.enum(TRADES, "Select a trade"),
  manpower: z.number().min(0, "Manpower can't be negative"),
  progress: z.string().min(1, "Describe today's progress for this trade"),
  issues: z.string().optional().default(""),
  photos: z.array(photoSchema).default([]),
});

export const dailyReportSchema = z.object({
  projectId: z.string().min(1, "Select a project"),
  projectName: z.string().min(1, "Project name is required"),
  reportedDate: z.string().min(1, "Reported date is required"),
  weatherCondition: z.enum(WEATHER_CONDITIONS),
  trades: z.array(tradeEntrySchema).min(1, "Add at least one trade"),
  otherIssues: z.string().optional().default(""),
});

export type DailyReportFormValues = z.input<typeof dailyReportSchema>;
export type DailyReportInput = z.output<typeof dailyReportSchema>;
export type TradeEntryInput = z.output<typeof tradeEntrySchema>;
