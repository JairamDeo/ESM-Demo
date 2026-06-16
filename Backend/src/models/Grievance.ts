import mongoose, { Document, Schema } from "mongoose";

export type GrievanceStatus = "pending" | "in-progress" | "escalated" | "resolved" | "closed";
export type GrievancePriority = "low" | "medium" | "high" | "critical";

export type ConcernScope = "general" | "document" | "both";

export interface IConcernDocument {
  documentLabel: string;
  documentText?: string;
  documentUploadId?: mongoose.Types.ObjectId;
  replacedDocumentUrl?: string;
}

export interface IComment {
  _id?: mongoose.Types.ObjectId;
  authorId?: mongoose.Types.ObjectId;
  authorName: string;
  authorRole: string;
  message: string;
  attachments?: string[];   // ← attachment URLs
  /** general = details; document = doc(s) only; both = details + doc(s) */
  concernScope?: ConcernScope;
  documentLabel?: string;
  documentText?: string;
  documentUploadId?: mongoose.Types.ObjectId;
  concernDocuments?: IConcernDocument[];
  /** Set when veteran re-uploads a corrected document */
  replacedDocumentUrl?: string;
  /** Translation fields (same pattern as top-level grievance) */
  originalText?: string;
  translatedText?: string;
  language?: string;
  translationFailed?: boolean;
  createdAt: Date;
}

export interface ITimeline {
  status: string;
  note: string;
  updatedBy: string;
  updatedAt: Date;
  attachments?: string[];
  /** status = status change; concern = officer flag; veteran_response = veteran reply; concern_resolved = officer accepted fix */
  eventType?: "status" | "concern" | "veteran_response" | "concern_resolved" | "escalation" | "escalation_request";
  concernScope?: ConcernScope;
  documentLabel?: string;
  documentText?: string;
  documentUploadId?: mongoose.Types.ObjectId;
  concernDocuments?: IConcernDocument[];
  replacedDocumentUrl?: string;
  originalText?: string;
  translatedText?: string;
  language?: string;
  translationFailed?: boolean;
}

export type ConcernStatus = "none" | "awaiting_veteran" | "awaiting_officer";

export type OrgTier = "station" | "hq" | "area";

export interface IPendingEscalationRequest {
  requestedByOfficerId: mongoose.Types.ObjectId;
  requestedByOfficerName: string;
  requestedByLevel: "L1" | "L2" | "L3";
  reason?: string;
  requestedAt: Date;
  status: "pending" | "approved" | "rejected";
}

export interface IGrievance extends Document {
  _id: mongoose.Types.ObjectId;
  grievanceId: string;
  type: string;
  caseTypeId?: mongoose.Types.ObjectId;
  veteranName: string;
  veteranPhone?: string;
  veteranArmyNo?: string;
  veteranRank?: string;
  userId?: mongoose.Types.ObjectId;
  stationId?: mongoose.Types.ObjectId;    // ← ref to Station
  stationName: string;                    // ← cached string
  hqId?: mongoose.Types.ObjectId;
  stateId?: mongoose.Types.ObjectId;
  officerId?: mongoose.Types.ObjectId;
  officerName: string;
  assignedLevel?: "L1" | "L2" | "L3";
  /** Org tier where the case is currently assigned (Station → HQ → Area). */
  assignedOrgTier?: OrgTier;
  status: GrievanceStatus;
  priority: GrievancePriority;
  description?: string;
  attachments?: string[];                 // ← top-level attachments
  createdBy?: string;                     // ← who created this grievance
  submissionSource: "qr_code" | "portal" | "manual" | "walk_in";
  qrCodeId?: mongoose.Types.ObjectId;
  comments: IComment[];
  timeline: ITimeline[];
  /** Blocks status changes while a concern cycle is open */
  concernStatus?: ConcernStatus;
  escalationId?: mongoose.Types.ObjectId;
  slaDeadline?: Date;
  /** Per-tier SLA deadline for current assigned level */
  slaTierDeadline?: Date;
  pendingEscalationRequest?: IPendingEscalationRequest;
  resolvedAt?: Date;
  closedAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  // ── Translation fields ──────────────────────────────────────────────────────
  /** Raw text as submitted by the veteran (may be Hindi) */
  originalText?: string;
  /** Auto-translated English version of originalText */
  translatedText?: string;
  /** Detected source language code e.g. "hi", "en" */
  language?: string;
  /** true if translation API failed (rate limit / timeout) */
  translationFailed?: boolean;
}

const ConcernDocumentSchema = new Schema({
  documentLabel: { type: String, required: true },
  documentText: { type: String },
  documentUploadId: { type: Schema.Types.ObjectId },
  replacedDocumentUrl: { type: String },
}, { _id: false });

const CommentSchema = new Schema<IComment>({
  authorId:    { type: Schema.Types.ObjectId },
  authorName:  { type: String, required: true },
  authorRole:  { type: String, required: true },
  message:     { type: String, required: true },
  attachments: { type: [String], default: [] },  // ← attachment URLs
  concernScope: { type: String, enum: ["general", "document", "both"] },
  documentLabel: { type: String },
  documentText: { type: String },
  documentUploadId: { type: Schema.Types.ObjectId },
  concernDocuments: { type: [ConcernDocumentSchema], default: undefined },
  replacedDocumentUrl: { type: String },
  // Translation fields on comments
  originalText:      { type: String },
  translatedText:    { type: String },
  language:          { type: String },
  translationFailed: { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now },
});

const TimelineSchema = new Schema<ITimeline>({
  status:      { type: String, required: true },
  note:        { type: String, default: "" },
  updatedBy:   { type: String, required: true },
  updatedAt:   { type: Date, default: Date.now },
  attachments: { type: [String], default: [] },
  eventType:   { type: String, enum: ["status", "concern", "veteran_response", "concern_resolved", "escalation", "escalation_request"], default: "status" },
  concernScope: { type: String, enum: ["general", "document", "both"] },
  documentLabel: { type: String },
  documentText: { type: String },
  documentUploadId: { type: Schema.Types.ObjectId },
  concernDocuments: { type: [ConcernDocumentSchema], default: undefined },
  replacedDocumentUrl: { type: String },
  originalText:      { type: String },
  translatedText:    { type: String },
  language:          { type: String },
  translationFailed: { type: Boolean, default: false },
});

const GrievanceSchema = new Schema<IGrievance>(
  {
    grievanceId:  { type: String, required: true, unique: true },
    type:         { type: String, required: true },
    caseTypeId:   { type: Schema.Types.ObjectId, ref: "CaseType" },
    veteranName:  { type: String, required: true, trim: true },
    veteranPhone: { type: String },
    veteranArmyNo:{ type: String },
    veteranRank:  { type: String },
    userId:       { type: Schema.Types.ObjectId, ref: "User" },
    stationId:    { type: Schema.Types.ObjectId, ref: "Station" },
    stationName:  { type: String, required: true },   // ← cached
    hqId:         { type: Schema.Types.ObjectId, ref: "HeadQuarter" },
    stateId:      { type: Schema.Types.ObjectId, ref: "State" },
    officerId:    { type: Schema.Types.ObjectId, ref: "Officer" },
    officerName:  { type: String, default: "Unassigned" },
    assignedLevel: { type: String, enum: ["L1", "L2", "L3"], default: "L1" },
    assignedOrgTier: { type: String, enum: ["station", "hq", "area"], default: "station" },
    status: {
      type: String,
      enum: ["pending", "in-progress", "escalated", "resolved", "closed"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    description:      { type: String },
    attachments:      { type: [String], default: [] },  // ← attachment URLs
    createdBy:        { type: String, default: "" },     // ← who created this grievance
    // ── Translation fields ──────────────────────────────────────────────────
    originalText:     { type: String },
    translatedText:   { type: String },
    language:         { type: String, default: "en" },
    translationFailed:{ type: Boolean, default: false },
    submissionSource: {
      type: String,
      enum: ["qr_code", "portal", "manual", "walk_in"],
      default: "portal",
    },
    qrCodeId:     { type: Schema.Types.ObjectId, ref: "QRCode" },
    comments:     { type: [CommentSchema],  default: [] },
    timeline:     { type: [TimelineSchema], default: [] },
    concernStatus: {
      type: String,
      enum: ["none", "awaiting_veteran", "awaiting_officer"],
      default: "none",
    },
    escalationId: { type: Schema.Types.ObjectId, ref: "Escalation" },
    slaDeadline:  { type: Date },
    slaTierDeadline: { type: Date },
    pendingEscalationRequest: {
      requestedByOfficerId: { type: Schema.Types.ObjectId, ref: "Officer" },
      requestedByOfficerName: { type: String },
      requestedByLevel: { type: String, enum: ["L1", "L2", "L3"] },
      reason: { type: String },
      requestedAt: { type: Date },
      status: { type: String, enum: ["pending", "approved", "rejected"] },
    },
    resolvedAt:   { type: Date },
    closedAt:     { type: Date },
    isDeleted:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

GrievanceSchema.index({ status: 1, createdAt: -1 });
GrievanceSchema.index({ stationName: 1 });
GrievanceSchema.index({ stationId: 1 });
GrievanceSchema.index({ type: 1 });
GrievanceSchema.index({ userId: 1 });
GrievanceSchema.index({ slaTierDeadline: 1, assignedLevel: 1, status: 1 });

export default mongoose.model<IGrievance>("Grievance", GrievanceSchema);