import mongoose, { Schema } from "mongoose";

export interface IAuditActor {
  officerId: mongoose.Types.ObjectId;
  name: string;
  role: string;
  rbacRole: string;
}

export const auditActorSchema = new Schema<IAuditActor>(
  {
    officerId: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
    name:      { type: String, required: true },
    role:      { type: String, required: true },
    rbacRole:  { type: String, required: true },
  },
  { _id: false }
);
