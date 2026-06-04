import mongoose, { Document, Schema } from "mongoose";

import { permissionSchemaFields } from "../constants/permissions";

export const OFFICER_LEVELS = ["L1", "L2", "L3"] as const;
export type OfficerLevel = (typeof OFFICER_LEVELS)[number];

export interface IOfficer extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  rank: string;
  role: "Area Officer" | "Headquarter Officer" | "Station HQ Officer";
  /** Escalation tier for Area / HQ / Station HQ officers (not used for Vitric super admin). */
  level?: OfficerLevel;
  station: mongoose.Types.ObjectId;
  stationName: string;
  email: string;
  phone?: string;
  activeCases: number;
  totalCasesHandled: number;
  status: "active" | "inactive";
  adminRef?: mongoose.Types.ObjectId;
  permissions: Record<string, boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const OfficerSchema = new Schema<IOfficer>(
  {
    name:  { type: String, required: true, trim: true },
    rank:  { type: String, trim: true, default: "" },
    role:  {
      type: String,
      enum: ["Area Officer", "Headquarter Officer", "Station HQ Officer"],
      required: true,
    },
    level: {
      type: String,
      enum: OFFICER_LEVELS,
      required: false,
    },
    station:     { type: Schema.Types.ObjectId, ref: "Station", required: true }, // ← ref
    stationName: { type: String, required: true },  // ← cached
    email:  { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:  { type: String },
    activeCases:       { type: Number, default: 0, min: 0 },
    totalCasesHandled: { type: Number, default: 0, min: 0 },
    status:   { type: String, enum: ["active", "inactive"], default: "active" },
    adminRef: { type: Schema.Types.ObjectId, ref: "Admin" },
    permissions: { type: permissionSchemaFields, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.model<IOfficer>("Officer", OfficerSchema);