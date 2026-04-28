import mongoose, { Document, Schema } from "mongoose";

export interface IEscalation extends Document {
  _id: mongoose.Types.ObjectId;
  escalationId: string;
  grievanceId: mongoose.Types.ObjectId;
  grievanceCode: string;
  veteranName: string;
  type: string;
  stationName: string;
  reason: string;
  escalatedTo: string;
  escalatedBy: string;
  daysOpen: number;
  status: "open" | "resolved" | "closed";
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
    resolvedAt: { type: Date },
    resolvedBy: { type: String },
    resolutionNote: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IEscalation>("Escalation", EscalationSchema);
