import mongoose, { Document, Schema } from "mongoose";

export type SlaMode = "common" | "separate";

export type SlaConfigSnapshot = {
  mode: SlaMode;
  hours?: number;
  minutes?: number;
  l1Hours?: number;
  l1Minutes?: number;
  l2Hours?: number;
  l2Minutes?: number;
  l3Hours?: number;
  l3Minutes?: number;
};

export interface ISlaEditor {
  officerId: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  role: string;
  rbacRole: string;
}

export interface ISlaChangeEntry {
  action: "create" | "update";
  previous?: SlaConfigSnapshot;
  next: SlaConfigSnapshot;
  changedBy: ISlaEditor;
  at: Date;
  note: string;
}

export interface ISlaConfig extends Document {
  _id: mongoose.Types.ObjectId;
  mode: SlaMode;
  hours?: number;
  minutes?: number;
  l1Hours?: number;
  l1Minutes?: number;
  l2Hours?: number;
  l2Minutes?: number;
  l3Hours?: number;
  l3Minutes?: number;
  /** @deprecated use lastEditedBy */
  updatedBy?: string;
  lastEditedBy?: ISlaEditor;
  lastEditedAt?: Date;
  changeHistory: ISlaChangeEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const slaSnapshotSchema = new Schema<SlaConfigSnapshot>(
  {
    mode: { type: String, enum: ["common", "separate"], required: true },
    hours: { type: Number, min: 0 },
    minutes: { type: Number, min: 0, max: 59 },
    l1Hours: { type: Number, min: 0 },
    l1Minutes: { type: Number, min: 0, max: 59 },
    l2Hours: { type: Number, min: 0 },
    l2Minutes: { type: Number, min: 0, max: 59 },
    l3Hours: { type: Number, min: 0 },
    l3Minutes: { type: Number, min: 0, max: 59 },
  },
  { _id: false }
);

const slaEditorSchema = new Schema<ISlaEditor>(
  {
    officerId: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
    name: { type: String, required: true },
    email: { type: String },
    role: { type: String, required: true },
    rbacRole: { type: String, required: true },
  },
  { _id: false }
);

const slaChangeEntrySchema = new Schema<ISlaChangeEntry>(
  {
    action: { type: String, enum: ["create", "update"], required: true },
    previous: { type: slaSnapshotSchema },
    next: { type: slaSnapshotSchema, required: true },
    changedBy: { type: slaEditorSchema, required: true },
    at: { type: Date, required: true, default: Date.now },
    note: { type: String, required: true },
  },
  { _id: true }
);

const SlaConfigSchema = new Schema<ISlaConfig>(
  {
    mode: { type: String, enum: ["common", "separate"], default: "common" },
    hours: { type: Number, min: 0 },
    minutes: { type: Number, min: 0, max: 59 },
    l1Hours: { type: Number, min: 0 },
    l1Minutes: { type: Number, min: 0, max: 59 },
    l2Hours: { type: Number, min: 0 },
    l2Minutes: { type: Number, min: 0, max: 59 },
    l3Hours: { type: Number, min: 0 },
    l3Minutes: { type: Number, min: 0, max: 59 },
    updatedBy: { type: String },
    lastEditedBy: { type: slaEditorSchema },
    lastEditedAt: { type: Date },
    changeHistory: { type: [slaChangeEntrySchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<ISlaConfig>("SlaConfig", SlaConfigSchema);

export function tierToTotalMinutes(hours?: number | null, minutes?: number | null): number {
  return Math.max(0, (hours || 0) * 60 + (minutes || 0));
}

export function addMinutesToDate(from: Date, totalMinutes: number): Date {
  return new Date(from.getTime() + totalMinutes * 60 * 1000);
}

export type SlaConfigPayload = {
  mode: SlaMode;
  hours?: number | null;
  minutes?: number | null;
  l1Hours?: number | null;
  l1Minutes?: number | null;
  l2Hours?: number | null;
  l2Minutes?: number | null;
  l3Hours?: number | null;
  l3Minutes?: number | null;
};
