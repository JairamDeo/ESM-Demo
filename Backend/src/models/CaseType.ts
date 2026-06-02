import mongoose, { Document, Schema } from "mongoose";

export interface ICaseType extends Document {
  _id: mongoose.Types.ObjectId;
  /**
   * Human-friendly unique id (e.g. "casetype1").
   * NOTE: older DBs may still contain numeric ids; those will be stringified.
   */
  id: string;
  name: string;
  description: string;
  category: mongoose.Types.ObjectId;
  totalCases: number;
  pendingCases: number;
  resolvedCases: number;
  isActive: boolean;
  createdBy?: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
  };
  updatedBy?: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
  };
  statusUpdatedBy?: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
  };
  statusUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CaseTypeSchema = new Schema<ICaseType>(
  {
    id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    totalCases: { type: Number, default: 0 },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    pendingCases: { type: Number, default: 0 },
    resolvedCases: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: {
      id: { type: String },
      name: { type: String },
      email: { type: String },
      role: { type: String },
    },
    updatedBy: {
      id: { type: String },
      name: { type: String },
      email: { type: String },
      role: { type: String },
    },
    statusUpdatedBy: {
      id: { type: String },
      name: { type: String },
      email: { type: String },
      role: { type: String },
    },
    statusUpdatedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<ICaseType>("CaseType", CaseTypeSchema);
