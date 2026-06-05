import mongoose, { Document, Schema } from "mongoose";
import { auditEntrySchema, IAuditEntry } from "./AuditLog";

export interface IState extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  isActive: boolean;
  auditHistory: IAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const StateSchema = new Schema<IState>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    isActive: { type: Boolean, default: true },
    auditHistory: { type: [auditEntrySchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<IState>("State", StateSchema);
