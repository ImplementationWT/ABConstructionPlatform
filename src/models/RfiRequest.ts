import mongoose, { Schema, models, model } from "mongoose";
import type { SyncStatus, IPhoto } from "@/models/DailyReport";

export interface IAssignedPerson {
  id: string;
  name: string;
  email: string;
}

export interface IRfiRequest {
  _id: mongoose.Types.ObjectId;
  projectId: string;
  projectName: string;
  subject: string;
  question: string;
  trades: string[];
  attachments: IPhoto[];
  assignedPersons: IAssignedPerson[];
  createdBy: mongoose.Types.ObjectId;
  status: SyncStatus;
  mondayItemId?: string;
  syncError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IPhoto>(
  {
    url: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

const AssignedPersonSchema = new Schema<IAssignedPerson>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
  },
  { _id: false }
);

const RfiRequestSchema = new Schema<IRfiRequest>(
  {
    projectId: { type: String, required: true },
    projectName: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    question: { type: String, required: true, trim: true },
    trades: { type: [String], default: [] },
    attachments: { type: [AttachmentSchema], default: [] },
    assignedPersons: { type: [AssignedPersonSchema], default: [] },
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

export const RfiRequest =
  models.RfiRequest || model<IRfiRequest>("RfiRequest", RfiRequestSchema);
