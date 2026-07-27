import mongoose, { Schema, models, model } from "mongoose";

export type UserRole = "admin" | "user";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  allowedProjectIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    allowedProjectIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>("User", UserSchema);
