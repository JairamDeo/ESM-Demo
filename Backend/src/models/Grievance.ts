// import mongoose, { Document, Schema } from "mongoose";

// export type GrievanceStatus = "pending" | "in-progress" | "escalated" | "resolved" | "closed";
// export type GrievancePriority = "low" | "medium" | "high" | "critical";

// export interface IComment {
//   _id?: mongoose.Types.ObjectId;
//   authorId?: mongoose.Types.ObjectId;
//   authorName: string;
//   authorRole: string;
//   message: string;
//   createdAt: Date;
// }

// export interface ITimeline {
//   status: string;
//   note: string;
//   updatedBy: string;
//   updatedAt: Date;
// }

// export interface IGrievance extends Document {
//   _id: mongoose.Types.ObjectId;
//   grievanceId: string;
//   type: string;
//   veteranName: string;
//   veteranPhone?: string;
//   veteranArmyNo?: string;
//   veteranRank?: string;
//   userId?: mongoose.Types.ObjectId;
//   stationId?: mongoose.Types.ObjectId;
//   stationName: string;
//   officerId?: mongoose.Types.ObjectId;
//   officerName: string;
//   status: GrievanceStatus;
//   priority: GrievancePriority;
//   description?: string;
//   submissionSource: "qr_code" | "portal" | "manual" | "walk_in";
//   qrCodeId?: mongoose.Types.ObjectId;
//   comments: IComment[];
//   timeline: ITimeline[];
//   escalationId?: mongoose.Types.ObjectId;
//   slaDeadline?: Date;
//   resolvedAt?: Date;
//   closedAt?: Date;
//   isDeleted: boolean;
//   createdAt: Date;
//   updatedAt: Date;
// }

// const CommentSchema = new Schema<IComment>({
//   authorId: { type: Schema.Types.ObjectId },
//   authorName: { type: String, required: true },
//   authorRole: { type: String, required: true },
//   message: { type: String, required: true },
//   createdAt: { type: Date, default: Date.now },
// });

// const TimelineSchema = new Schema<ITimeline>({
//   status: { type: String, required: true },
//   note: { type: String, default: "" },
//   updatedBy: { type: String, required: true },
//   updatedAt: { type: Date, default: Date.now },
// });

// const GrievanceSchema = new Schema<IGrievance>(
//   {
//     grievanceId: { type: String, required: true, unique: true },
//     type: { type: String, required: true },
//     veteranName: { type: String, required: true, trim: true },
//     veteranPhone: { type: String },
//     veteranArmyNo: { type: String },
//     veteranRank: { type: String },
//     userId: { type: Schema.Types.ObjectId, ref: "User" },
//     stationId: { type: Schema.Types.ObjectId, ref: "Station" },
//     stationName: { type: String, required: true },
//     officerId: { type: Schema.Types.ObjectId, ref: "Officer" },
//     officerName: { type: String, default: "Unassigned" },
//     status: {
//       type: String,
//       enum: ["pending", "in-progress", "escalated", "resolved", "closed"],
//       default: "pending",
//     },
//     priority: {
//       type: String,
//       enum: ["low", "medium", "high", "critical"],
//       default: "medium",
//     },
//     description: { type: String },
//     submissionSource: {
//       type: String,
//       enum: ["qr_code", "portal", "manual", "walk_in"],
//       default: "portal",
//     },
//     qrCodeId: { type: Schema.Types.ObjectId, ref: "QRCode" },
//     comments: { type: [CommentSchema], default: [] },
//     timeline: { type: [TimelineSchema], default: [] },
//     escalationId: { type: Schema.Types.ObjectId, ref: "Escalation" },
//     slaDeadline: { type: Date },
//     resolvedAt: { type: Date },
//     closedAt: { type: Date },
//     isDeleted: { type: Boolean, default: false },
//   },
//   { timestamps: true }
// );

// GrievanceSchema.index({ status: 1, createdAt: -1 });
// GrievanceSchema.index({ stationName: 1 });
// GrievanceSchema.index({ type: 1 });
// GrievanceSchema.index({ userId: 1 });
// // GrievanceSchema.index({ grievanceId: 1 });
// GrievanceSchema.index({ isDeleted: 1 });

// export default mongoose.model<IGrievance>("Grievance", GrievanceSchema);





import mongoose, { Document, Schema } from "mongoose";

export type GrievanceStatus = "pending" | "in-progress" | "escalated" | "resolved" | "closed";
export type GrievancePriority = "low" | "medium" | "high" | "critical";

export interface IComment {
  _id?: mongoose.Types.ObjectId;
  authorId?: mongoose.Types.ObjectId;
  authorName: string;
  authorRole: string;
  message: string;
  attachments?: string[];   // ← attachment URLs
  createdAt: Date;
}

export interface ITimeline {
  status: string;
  note: string;
  updatedBy: string;
  updatedAt: Date;
  attachments?: string[];   // ← attachment URLs on timeline
}

export interface IGrievance extends Document {
  _id: mongoose.Types.ObjectId;
  grievanceId: string;
  type: string;
  veteranName: string;
  veteranPhone?: string;
  veteranArmyNo?: string;
  veteranRank?: string;
  userId?: mongoose.Types.ObjectId;
  stationId?: mongoose.Types.ObjectId;    // ← ref to Station
  stationName: string;                    // ← cached string
  officerId?: mongoose.Types.ObjectId;
  officerName: string;
  status: GrievanceStatus;
  priority: GrievancePriority;
  description?: string;
  attachments?: string[];                 // ← top-level attachments
  submissionSource: "qr_code" | "portal" | "manual" | "walk_in";
  qrCodeId?: mongoose.Types.ObjectId;
  comments: IComment[];
  timeline: ITimeline[];
  escalationId?: mongoose.Types.ObjectId;
  slaDeadline?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>({
  authorId:    { type: Schema.Types.ObjectId },
  authorName:  { type: String, required: true },
  authorRole:  { type: String, required: true },
  message:     { type: String, required: true },
  attachments: { type: [String], default: [] },  // ← attachment URLs
  createdAt:   { type: Date, default: Date.now },
});

const TimelineSchema = new Schema<ITimeline>({
  status:      { type: String, required: true },
  note:        { type: String, default: "" },
  updatedBy:   { type: String, required: true },
  updatedAt:   { type: Date, default: Date.now },
  attachments: { type: [String], default: [] },  // ← attachment URLs
});

const GrievanceSchema = new Schema<IGrievance>(
  {
    grievanceId:  { type: String, required: true, unique: true },
    type:         { type: String, required: true },
    veteranName:  { type: String, required: true, trim: true },
    veteranPhone: { type: String },
    veteranArmyNo:{ type: String },
    veteranRank:  { type: String },
    userId:       { type: Schema.Types.ObjectId, ref: "User" },
    stationId:    { type: Schema.Types.ObjectId, ref: "Station" },
    stationName:  { type: String, required: true },   // ← cached
    officerId:    { type: Schema.Types.ObjectId, ref: "Officer" },
    officerName:  { type: String, default: "Unassigned" },
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
    submissionSource: {
      type: String,
      enum: ["qr_code", "portal", "manual", "walk_in"],
      default: "portal",
    },
    qrCodeId:     { type: Schema.Types.ObjectId, ref: "QRCode" },
    comments:     { type: [CommentSchema],  default: [] },
    timeline:     { type: [TimelineSchema], default: [] },
    escalationId: { type: Schema.Types.ObjectId, ref: "Escalation" },
    slaDeadline:  { type: Date },
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
GrievanceSchema.index({ isDeleted: 1 });

export default mongoose.model<IGrievance>("Grievance", GrievanceSchema);