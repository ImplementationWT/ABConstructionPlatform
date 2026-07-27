import mongoose, { Schema, models, model } from "mongoose";

export interface IProjectLink {
  _id: mongoose.Types.ObjectId;
  projectId: string;
  projectName: string;
  tradeFormUrl: string;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectLinkSchema = new Schema<IProjectLink>(
  {
    projectId: { type: String, required: true, unique: true },
    projectName: { type: String, required: true, trim: true },
    tradeFormUrl: { type: String, default: "", trim: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const ProjectLink =
  models.ProjectLink || model<IProjectLink>("ProjectLink", ProjectLinkSchema);
