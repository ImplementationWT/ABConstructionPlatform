import mongoose, { Schema, models, model } from "mongoose";
import type { SyncStatus } from "@/models/DailyReport";

export interface IInspectionRequest {
  _id: mongoose.Types.ObjectId;
  projectId: string;
  projectName: string;
  trades: string[];
  startDate: Date;
  endDate: Date;
  details: string;
  createdBy: mongoose.Types.ObjectId;
  status: SyncStatus;
  mondayItemId?: string;
  syncError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InspectionRequestSchema = new Schema<IInspectionRequest>(
  {
    projectId: { type: String, required: true },
    projectName: { type: String, required: true, trim: true },
    trades: { type: [String], required: true, validate: (v: string[]) => v.length > 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    details: { type: String, required: true, trim: true },
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

export const InspectionRequest =
  models.InspectionRequest ||
  model<IInspectionRequest>("InspectionRequest", InspectionRequestSchema);
