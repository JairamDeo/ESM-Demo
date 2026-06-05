import mongoose, { Schema } from "mongoose";

export type AuditAction =
  | "create"
  | "update"
  | "status_toggle"
  | "delete"
  | "rbac_toggle"
  | "rbac_reset"
  | "rbac_reset_all";

/** Append-only audit entry for org entities (area, HQ, station, officer). */
export interface IAuditEntry {
  action: AuditAction;
  officerId: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  role: string;
  rbacRole: string;
  at: Date;
  note?: string;
}

/** Append-only RBAC permission change log. */
export interface IRbacChangeEntry {
  action: "toggle" | "reset" | "reset_all";
  permission?: string;
  previousValue?: boolean;
  newValue?: boolean;
  changedBy: {
    officerId: mongoose.Types.ObjectId;
    name: string;
    email?: string;
    role: string;
    rbacRole: string;
  };
  at: Date;
  note?: string;
}

export const auditEntrySchema = new Schema<IAuditEntry>(
  {
    action:    { type: String, required: true },
    officerId: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
    name:      { type: String, required: true },
    email:     { type: String },
    role:      { type: String, required: true },
    rbacRole:  { type: String, required: true },
    at:        { type: Date, required: true, default: Date.now },
    note:      { type: String },
  },
  { _id: true }
);

export const rbacChangeEntrySchema = new Schema<IRbacChangeEntry>(
  {
    action:         { type: String, enum: ["toggle", "reset", "reset_all"], required: true },
    permission:     { type: String },
    previousValue:  { type: Boolean },
    newValue:       { type: Boolean },
    changedBy: {
      officerId: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
      name:      { type: String, required: true },
      email:     { type: String },
      role:      { type: String, required: true },
      rbacRole:  { type: String, required: true },
    },
    at:   { type: Date, required: true, default: Date.now },
    note: { type: String },
  },
  { _id: true }
);
