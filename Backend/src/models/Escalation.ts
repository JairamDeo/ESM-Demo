import mongoose, { Document, Schema } from "mongoose";
import { OfficerLevel } from "../constants/officerLevels";
import { OrgTier } from "../constants/orgTiers";

export type EscalationReasonType =
  | "no_response"
  | "concern_pending"
  | "sla_breach"
  | "manual_request"
  | "approved_request";

export interface IEscalation extends Document {
  _id: mongoose.Types.ObjectId;
  escalationId: string;
  grievanceId: mongoose.Types.ObjectId;
  grievanceCode: string;
  veteranName: string;
  /** Case type name (legacy field name) */
  type: string;
  stationName: string;
  reason: string;
  escalatedTo: string;
  escalatedBy: string;
  daysOpen: number;
  status: "open" | "resolved" | "closed";
  escalationReasonType?: EscalationReasonType;
  fromLevel?: OfficerLevel;
  toLevel?: OfficerLevel;
  fromOrgTier?: OrgTier;
  toOrgTier?: OrgTier;
  fromOfficerId?: mongoose.Types.ObjectId;
  fromOfficerName?: string;
  approvalStatus?: "pending" | "approved" | "rejected" | "n/a";
  requestedByLevel?: OfficerLevel;
  requestedByOfficerId?: mongoose.Types.ObjectId;
  officerId?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EscalationSchema = new Schema<IEscalation>(
  {
    escalationId: { type: String, required: true, unique: true },
    grievanceId: { type: Schema.Types.ObjectId, ref: "Grievance", required: true },
    grievanceCode: { type: String, required: true },
    veteranName: { type: String, required: true },
    type: { type: String, required: true },
    stationName: { type: String, required: true },
    reason: { type: String, required: true },
    escalatedTo: { type: String, required: true },
    escalatedBy: { type: String, default: "System (Auto)" },
    daysOpen: { type: Number, default: 0 },
    status: { type: String, enum: ["open", "resolved", "closed"], default: "open" },
    escalationReasonType: {
      type: String,
      enum: ["no_response", "concern_pending", "sla_breach", "manual_request", "approved_request"],
    },
    fromLevel: { type: String, enum: ["L1", "L2", "L3"] },
    toLevel: { type: String, enum: ["L1", "L2", "L3"] },
    fromOrgTier: { type: String, enum: ["station", "hq", "area"] },
    toOrgTier: { type: String, enum: ["station", "hq", "area"] },
    fromOfficerId: { type: Schema.Types.ObjectId, ref: "Officer" },
    fromOfficerName: { type: String },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "n/a"],
      default: "n/a",
    },
    requestedByLevel: { type: String, enum: ["L1", "L2", "L3"] },
    requestedByOfficerId: { type: Schema.Types.ObjectId, ref: "Officer" },
    officerId: { type: Schema.Types.ObjectId, ref: "Officer" },
    resolvedAt: { type: Date },
    resolvedBy: { type: String },
    resolutionNote: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IEscalation>("Escalation", EscalationSchema);
