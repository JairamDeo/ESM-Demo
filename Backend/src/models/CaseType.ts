import mongoose, { Document, Schema } from "mongoose";

export interface ICaseType extends Document {
  _id: mongoose.Types.ObjectId;
  id: number;
  name: string;
  description: string;
  totalCases: number;
  pendingCases: number;
  resolvedCases: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CaseTypeSchema = new Schema<ICaseType>(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    totalCases: { type: Number, default: 0 },
    pendingCases: { type: Number, default: 0 },
    resolvedCases: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICaseType>("CaseType", CaseTypeSchema);
