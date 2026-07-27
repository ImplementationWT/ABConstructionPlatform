import mongoose, { Schema, models, model } from "mongoose";

export type WeatherCondition =
  | "fair"
  | "severe_heat"
  | "severe_rain"
  | "severe_wind"
  | "extreme_weather";

export type SyncStatus = "pending_sync" | "synced" | "sync_failed";

export interface IPhoto {
  url: string;
  name: string;
}

export interface ITradeEntry {
  tradeName: string;
  manpower: number;
  progress: string;
  issues: string;
  photos: IPhoto[];
  mondaySubitemId?: string;
}

export interface IDailyReport {
  _id: mongoose.Types.ObjectId;
  projectId: string;
  projectName: string;
  reportedDate: Date;
  weatherCondition: WeatherCondition;
  trades: ITradeEntry[];
  otherIssues: string;
  createdBy: mongoose.Types.ObjectId;
  status: SyncStatus;
  mondayItemId?: string;
  syncError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PhotoSchema = new Schema<IPhoto>(
  {
    url: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

const TradeEntrySchema = new Schema<ITradeEntry>(
  {
    tradeName: { type: String, required: true, trim: true },
    manpower: { type: Number, required: true, min: 0, default: 0 },
    progress: { type: String, default: "", trim: true },
    issues: { type: String, default: "", trim: true },
    photos: { type: [PhotoSchema], default: [] },
    mondaySubitemId: { type: String },
  },
  { _id: false }
);

const DailyReportSchema = new Schema<IDailyReport>(
  {
    projectId: { type: String, required: true },
    projectName: { type: String, required: true, trim: true },
    reportedDate: { type: Date, required: true },
    weatherCondition: {
      type: String,
      enum: ["fair", "severe_heat", "severe_rain", "severe_wind", "extreme_weather"],
      required: true,
    },
    trades: { type: [TradeEntrySchema], default: [] },
    otherIssues: { type: String, default: "", trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending_sync", "synced", "sync_failed"],
      default: "pending_sync",
    },
    mondayItemId: { type: String },
    syncError: { type: String },
  },
  { timestamps: true }
);

export const DailyReport =
  models.DailyReport || model<IDailyReport>("DailyReport", DailyReportSchema);
