import mongoose, { Document, Schema } from "mongoose";
import { auditEntrySchema, IAuditEntry } from "./AuditLog";
import { orgOfficerRefSchema } from "./orgOfficerRef";

export interface IStateOfficerRef {
  officerId: mongoose.Types.ObjectId;
  role: string;
  level?: "L1" | "L2" | "L3";
}

export interface IState extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  isActive: boolean;
  officers: IStateOfficerRef[];
  auditHistory: IAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const StateSchema = new Schema<IState>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    isActive: { type: Boolean, default: true },
    officers: { type: [orgOfficerRefSchema], default: [] },
    auditHistory: { type: [auditEntrySchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<IState>("State", StateSchema);
